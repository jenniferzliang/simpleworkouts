// Frontend workout parser - no backend dependencies
import { getExerciseByName, type Exercise } from './exerciseDatabase';

export interface ParsedSet {
  setNumber: number;
  reps: number;
  weight: number | null;
  unit: 'kg' | 'lb' | null;
  isBodyweight: boolean;
}

export interface ParsedExercise {
  exercise: {
    name: string;
    category: string;
    isBodyweight: boolean;
  };
  sets: ParsedSet[];
  mode: 'aggregate' | 'per-set' | 'reps-only';
  originalText: string;
}

export interface ParseWarning {
  line: number;
  message: string;
  suggestion?: string;
  originalText: string;
}

export interface ParseResult {
  exercises: ParsedExercise[];
  warnings: ParseWarning[];
  tokens: any[];
  metadata?: {
    duration: number;
    originalText: string;
    unitPreference: string;
    timestamp: string;
  };
}

export class WorkoutParser {
  private warnings: ParseWarning[] = [];
  private tokens: any[] = [];

  // Main parsing function
  parseWorkoutText(text: string, unitPreference: 'kg' | 'lb' = 'lb'): ParseResult {
    const startTime = performance.now();
    this.warnings = [];
    this.tokens = [];

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const exercises: ParsedExercise[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (!line) continue;

      try {
        const parsedExercise = this.parseLine(line, lineIndex + 1, unitPreference);
        if (parsedExercise) {
          exercises.push(parsedExercise);
        }
      } catch (error) {
        this.warnings.push({
          line: lineIndex + 1,
          message: `Failed to parse line: ${(error as Error).message}`,
          originalText: line
        });
      }
    }

    const duration = performance.now() - startTime;

    return {
      exercises,
      warnings: this.warnings,
      tokens: this.tokens,
      metadata: {
        duration: Math.round(duration),
        originalText: text,
        unitPreference,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Parse a single line
  private parseLine(line: string, lineNumber: number, unitPreference: 'kg' | 'lb'): ParsedExercise | null {
    const tokens = this.tokenizeLine(line);
    this.tokens.push({ line: lineNumber, tokens });

    if (tokens.length < 2) {
      this.warnings.push({
        line: lineNumber,
        message: 'Line too short - need exercise name and set info',
        originalText: line
      });
      return null;
    }

    // Extract exercise name (everything before the first number)
    const exerciseName = this.extractExerciseName(tokens);
    const setTokens = tokens.slice(exerciseName.split(' ').length);

    // Find exercise in local database
    const exercise = getExerciseByName(exerciseName);

    // Determine parsing mode and parse sets
    const mode = this.detectParsingMode(setTokens);
    const isBodyweight = exercise?.isBodyweight || false;
    const sets = this.parseSets(setTokens, mode, unitPreference, isBodyweight);

    if (sets.length === 0) {
      this.warnings.push({
        line: lineNumber,
        message: 'No valid sets found',
        originalText: line
      });
      return null;
    }

    // Format exercise name (capitalize first letter of each word)
    const formattedName = exercise
      ? exercise.name
      : exerciseName.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

    return {
      exercise: {
        name: formattedName,
        category: exercise?.category || 'other',
        isBodyweight: isBodyweight
      },
      sets,
      mode,
      originalText: line
    };
  }

  // Tokenize line into words/numbers
  private tokenizeLine(line: string): string[] {
    return line
      .toLowerCase()
      .replace(/[,;]/g, ' ') // Replace separators with spaces
      .replace(/(\d+)x(\d+)x(\d+)/g, '$1 x $2 x $3') // Split 3x5x135 -> 3 x 5 x 135
      .replace(/(\d+)x(\d+)/g, '$1 x $2') // Split 3x5 -> 3 x 5
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  // Extract exercise name from tokens
  private extractExerciseName(tokens: string[]): string {
    const nameTokens: string[] = [];
    for (const token of tokens) {
      // Stop when we hit a number or 'x'
      if (/^\d/.test(token) || token === 'x') {
        break;
      }
      nameTokens.push(token);
    }
    return nameTokens.join(' ');
  }

  // Detect parsing mode based on tokens
  private detectParsingMode(tokens: string[]): 'aggregate' | 'per-set' | 'reps-only' {
    const hasXPattern = tokens.includes('x');
    const numberTokens = tokens.filter(t => /^\d/.test(t));

    // Check for compact aggregate pattern first: "3x5x135" becomes ['3', 'x', '5', 'x', '135']
    // This is 3 consecutive numbers with exactly 2 'x' tokens between them
    if (numberTokens.length === 3 && tokens.length === 5 &&
        tokens[0] === numberTokens[0] && tokens[1] === 'x' &&
        tokens[2] === numberTokens[1] && tokens[3] === 'x' &&
        tokens[4] === numberTokens[2]) {
      return 'aggregate';
    }

    // Check for multi-rep same weight pattern: "7,8x85" becomes ['7', '8', 'x', '85']
    // Multiple numbers followed by 'x' and a weight
    if (hasXPattern && this.hasMultiRepSameWeight(tokens)) {
      return 'per-set';
    }

    // Check for per-set pattern: multiple REPS x WEIGHT tokens
    // This takes priority when we have 2+ separate set patterns
    const perSetCount = this.countPerSetTokens(tokens);
    if (hasXPattern && perSetCount >= 2) {
      return 'per-set';
    }

    // Check for aggregate pattern: SETS x REPS (x WEIGHT optional)
    if (hasXPattern && numberTokens.length >= 2) {
      const xIndices = tokens.map((t, i) => t === 'x' ? i : -1).filter(i => i !== -1);
      // SETS x REPS pattern with one 'x'
      if (xIndices.length === 1 && numberTokens.length >= 2) {
        return 'aggregate';
      }
      // Multiple 'x' but only one per-set pattern - still aggregate
      if (xIndices.length >= 2 && perSetCount <= 1) {
        return 'aggregate';
      }
    }

    // Default to reps-only (bodyweight)
    return 'reps-only';
  }

  // Check for multi-rep same weight pattern: ['7', '8', 'x', '85']
  private hasMultiRepSameWeight(tokens: string[]): boolean {
    const xIndex = tokens.indexOf('x');
    if (xIndex <= 1 || xIndex >= tokens.length - 1) return false;

    // Check if there are 2+ numbers before 'x' and 1 number after
    const numbersBeforeX = tokens.slice(0, xIndex).filter(t => /^\d/.test(t));
    const numbersAfterX = tokens.slice(xIndex + 1).filter(t => /^\d/.test(t));

    return numbersBeforeX.length >= 2 && numbersAfterX.length >= 1;
  }

  // Count per-set tokens (REPS x WEIGHT patterns)
  private countPerSetTokens(tokens: string[]): number {
    let count = 0;
    for (let i = 0; i < tokens.length - 2; i++) {
      if (/^\d/.test(tokens[i]) && tokens[i + 1] === 'x' && /^\d/.test(tokens[i + 2])) {
        count++;
      }
    }
    return count;
  }

  // Parse sets based on mode
  private parseSets(tokens: string[], mode: string, unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    // Check for mixed format: aggregate followed by per-set (e.g., "2x8x30 8x35")
    if (this.hasMixedFormat(tokens)) {
      return this.parseMixedSets(tokens, unitPreference, isBodyweight);
    }

    switch (mode) {
      case 'aggregate':
        return this.parseAggregateSets(tokens, unitPreference, isBodyweight);
      case 'per-set':
        return this.parsePerSetSets(tokens, unitPreference, isBodyweight);
      case 'reps-only':
        return this.parseRepsOnlySets(tokens);
      default:
        return [];
    }
  }

  // Check for mixed format: starts with aggregate (3x5x135) followed by per-set (8x155)
  private hasMixedFormat(tokens: string[]): boolean {
    // Must have at least 8 tokens for mixed format: ['2', 'x', '8', 'x', '30', '8', 'x', '35']
    if (tokens.length < 8) return false;

    // Check if first 5 tokens match aggregate pattern
    const numberTokens = tokens.filter(t => /^\d/.test(t));
    if (numberTokens.length >= 4 && tokens.length > 5 &&
        tokens[0] === numberTokens[0] && tokens[1] === 'x' &&
        tokens[2] === numberTokens[1] && tokens[3] === 'x' &&
        tokens[4] === numberTokens[2]) {
      // Check if there are additional number x number patterns after
      const remainingTokens = tokens.slice(5);
      return this.countPerSetTokens(remainingTokens) >= 1;
    }

    return false;
  }

  // Parse mixed format: "2x8x30 8x35" = 2 sets of 8@30 + 1 set of 8@35
  private parseMixedSets(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const sets: ParsedSet[] = [];

    // Parse the aggregate part (first 5 tokens)
    const aggregateTokens = tokens.slice(0, 5);
    const aggregateSets = this.parseAggregateSets(aggregateTokens, unitPreference, isBodyweight);
    sets.push(...aggregateSets);

    // Parse the remaining per-set patterns
    const remainingTokens = tokens.slice(5);
    const perSetSets = this.parsePerSetSets(remainingTokens, unitPreference, isBodyweight);

    // Renumber the per-set sets to continue from where aggregate left off
    const startingSetNumber = sets.length + 1;
    perSetSets.forEach((set, index) => {
      sets.push({
        ...set,
        setNumber: startingSetNumber + index
      });
    });

    return sets;
  }

  // Parse aggregate format: 3x5x135 or 3x5
  private parseAggregateSets(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const numbers = tokens.filter(t => /^\d/.test(t)).map(t => parseFloat(t));
    const hasBodyweight = tokens.includes('bw');

    if (numbers.length < 2) return [];

    const sets = parseInt(String(numbers[0]));
    const reps = parseInt(String(numbers[1]));
    const weight = numbers.length >= 3 ? numbers[2] : null;

    const result: ParsedSet[] = [];
    for (let i = 1; i <= sets; i++) {
      result.push({
        setNumber: i,
        reps,
        weight: (hasBodyweight || isBodyweight) ? null : weight,
        unit: (hasBodyweight || isBodyweight || !weight) ? null : unitPreference,
        isBodyweight: hasBodyweight || isBodyweight || !weight
      });
    }

    return result;
  }

  // Parse per-set format: 10x40kg 10x45kg 8x45kg OR 7,8x85
  private parsePerSetSets(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const sets: ParsedSet[] = [];
    let startIndex = 0;

    // Check for multi-rep same weight pattern at the beginning: ['7', '8', 'x', '85']
    if (this.hasMultiRepSameWeight(tokens)) {
      const xIndex = tokens.indexOf('x');
      const repsTokens = tokens.slice(0, xIndex).filter(t => /^\d/.test(t));
      const weightToken = tokens[xIndex + 1];

      let weight: number | null = null;
      let unit: 'kg' | 'lb' | null = null;
      let isBw = false;

      if (weightToken === 'bw') {
        isBw = true;
      } else if (/^\d/.test(weightToken)) {
        weight = this.parseWeight(weightToken);
        unit = this.extractUnit(weightToken) || unitPreference;
        isBw = isBodyweight;
      }

      // Create one set for each rep count
      repsTokens.forEach((repsToken, index) => {
        sets.push({
          setNumber: index + 1,
          reps: parseInt(repsToken),
          weight: isBw ? null : weight,
          unit: isBw ? null : unit,
          isBodyweight: isBw
        });
      });

      // Continue parsing from after the multi-rep pattern
      startIndex = xIndex + 2; // Skip past 'x' and weight token
    }

    // Standard per-set format: 10x135 8x155 6x175
    let setNumber = sets.length + 1;
    for (let i = startIndex; i < tokens.length - 2; i++) {
      // Check if we're at the start of a multi-rep pattern (e.g., "7,8x35")
      const remainingTokens = tokens.slice(i);
      if (this.hasMultiRepSameWeight(remainingTokens)) {
        // Find the 'x' in the remaining tokens
        const xIndex = remainingTokens.indexOf('x');
        const repsTokens = remainingTokens.slice(0, xIndex).filter(t => /^\d/.test(t));
        const weightToken = remainingTokens[xIndex + 1];

        let weight: number | null = null;
        let unit: 'kg' | 'lb' | null = null;
        let isBw = false;

        if (weightToken === 'bw') {
          isBw = true;
        } else if (/^\d/.test(weightToken)) {
          weight = this.parseWeight(weightToken);
          unit = this.extractUnit(weightToken) || unitPreference;
          isBw = isBodyweight;
        }

        // Create one set for each rep count
        repsTokens.forEach((repsToken) => {
          sets.push({
            setNumber: setNumber++,
            reps: parseInt(repsToken),
            weight: isBw ? null : weight,
            unit: isBw ? null : unit,
            isBodyweight: isBw
          });
        });

        // Skip past all the tokens we just processed
        i += xIndex + 1; // Will be incremented by loop, so we end up after the weight
        continue;
      }

      // Standard single rep x weight pattern
      if (/^\d/.test(tokens[i]) && tokens[i + 1] === 'x') {
        const reps = parseInt(tokens[i]);
        const weightToken = tokens[i + 2];

        let weight: number | null = null;
        let unit: 'kg' | 'lb' | null = null;
        let isBw = false;

        if (weightToken === 'bw') {
          isBw = true;
        } else if (/^\d/.test(weightToken)) {
          weight = this.parseWeight(weightToken);
          unit = this.extractUnit(weightToken) || unitPreference;
          isBw = isBodyweight;
        }

        sets.push({
          setNumber: setNumber++,
          reps,
          weight: isBw ? null : weight,
          unit: isBw ? null : unit,
          isBodyweight: isBw
        });

        i += 2; // Skip the 'x' and weight tokens
      }
    }

    return sets;
  }

  // Parse reps-only format: 12 10 8
  private parseRepsOnlySets(tokens: string[]): ParsedSet[] {
    const repsValues = tokens.filter(t => /^\d+$/.test(t)).map(t => parseInt(t));

    return repsValues.map((reps, index) => ({
      setNumber: index + 1,
      reps,
      weight: null,
      unit: null,
      isBodyweight: true
    }));
  }

  // Extract weight value from token
  private parseWeight(token: string): number | null {
    const match = token.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  // Extract unit from token
  private extractUnit(token: string): 'kg' | 'lb' | null {
    if (token.includes('kg')) return 'kg';
    if (token.includes('lb') || token.includes('lbs')) return 'lb';
    return null;
  }
}
