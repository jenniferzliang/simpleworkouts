// Frontend workout parser - no backend dependencies
import { getExerciseByName } from './exerciseDatabase';

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

/**
 * Represents a weight value with optional unit
 */
interface WeightInfo {
  value: number | null;
  unit: 'kg' | 'lb' | null;
  isBodyweight: boolean;
}

/**
 * Represents a contiguous group of tokens that form one or more sets
 */
interface SetGroup {
  type: 'aggregate' | 'multi-rep' | 'single' | 'reps-only';
  tokens: string[];
  startIndex: number;
  endIndex: number;
}

export class WorkoutParser {
  private warnings: ParseWarning[] = [];
  private tokens: any[] = [];

  // ============================================================================
  // PUBLIC API
  // ============================================================================

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

  // ============================================================================
  // LINE PARSING
  // ============================================================================

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

    // Extract exercise name and set tokens
    const exerciseName = this.extractExerciseName(tokens);
    const setTokens = tokens.slice(exerciseName.split(' ').length);

    // Look up exercise info
    const exercise = getExerciseByName(exerciseName);
    const isBodyweight = exercise?.isBodyweight || false;

    // Identify set groups and parse them (pass isBodyweight for smarter detection)
    const setGroups = this.identifySetGroups(setTokens, isBodyweight);
    const sets = this.parseSetGroups(setGroups, unitPreference, isBodyweight);

    if (sets.length === 0) {
      this.warnings.push({
        line: lineNumber,
        message: 'No valid sets found',
        originalText: line
      });
      return null;
    }

    // Determine overall mode (aggregate if first group is aggregate, otherwise per-set or reps-only)
    const mode = setGroups.length > 0 ?
      (setGroups[0].type === 'aggregate' ? 'aggregate' :
       setGroups[0].type === 'reps-only' ? 'reps-only' : 'per-set') : 'reps-only';

    // Format exercise name
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

  // ============================================================================
  // TOKENIZATION
  // ============================================================================

  private tokenizeLine(line: string): string[] {
    return line
      .toLowerCase()
      .replace(/[,;]/g, ' ') // Replace separators with spaces
      .replace(/(\d+)x(\d+)x(\d+)/g, '$1 x $2 x $3') // Split 3x5x135 -> 3 x 5 x 135
      .replace(/(\d+)x(\d+)/g, '$1 x $2') // Split 3x5 -> 3 x 5
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private extractExerciseName(tokens: string[]): string {
    const nameTokens: string[] = [];
    for (const token of tokens) {
      if (/^\d/.test(token) || token === 'x') break;
      nameTokens.push(token);
    }
    return nameTokens.join(' ');
  }

  // ============================================================================
  // SET GROUP IDENTIFICATION
  // ============================================================================

  /**
   * Identify contiguous groups of tokens that represent sets
   * Examples:
   *   - "3 x 5 x 135" → [aggregate]
   *   - "7 8 x 85 6 x 30" → [multi-rep, single]
   *   - "3 x 5 x 135 5 x 155" → [aggregate, single]
   *   - "12 10 8" → [reps-only]
   */
  private identifySetGroups(tokens: string[], isBodyweightExercise: boolean): SetGroup[] {
    const groups: SetGroup[] = [];
    let i = 0;

    while (i < tokens.length) {
      // Try to identify a set group starting at position i
      const group = this.identifySetGroupAt(tokens, i, isBodyweightExercise);

      if (group) {
        groups.push(group);
        i = group.endIndex + 1;
      } else {
        // No structured group found - if this is a number AND it's a bodyweight exercise,
        // treat as single reps-only value
        if (isBodyweightExercise && /^\d+$/.test(tokens[i])) {
          groups.push({
            type: 'reps-only',
            tokens: [tokens[i]],
            startIndex: i,
            endIndex: i
          });
        }
        i++;
      }
    }

    // If no groups found but we have tokens, treat as reps-only
    if (groups.length === 0 && tokens.length > 0) {
      const numbers = tokens.filter(t => /^\d+$/.test(t));
      if (numbers.length > 0) {
        groups.push({
          type: 'reps-only',
          tokens: tokens,
          startIndex: 0,
          endIndex: tokens.length - 1
        });
      }
    }

    return groups;
  }

  /**
   * Identify what type of set group starts at the given position
   */
  private identifySetGroupAt(tokens: string[], startIndex: number, isBodyweightExercise: boolean): SetGroup | null {
    const remaining = tokens.slice(startIndex);

    // Check for aggregate pattern with weight: SETS x REPS x WEIGHT (exactly 5 tokens)
    if (remaining.length >= 5 &&
        this.isNumber(remaining[0]) &&
        remaining[1] === 'x' &&
        this.isNumber(remaining[2]) &&
        remaining[3] === 'x' &&
        this.isNumber(remaining[4])) {
      return {
        type: 'aggregate',
        tokens: remaining.slice(0, 5),
        startIndex,
        endIndex: startIndex + 4
      };
    }

    // Check for bodyweight aggregate: SETS x REPS [bw]
    // If we know it's a bodyweight exercise, be more permissive
    // Important: tokens must be pure numbers (no units like "kg" or "lb")
    if (remaining.length >= 3 &&
        /^\d+$/.test(remaining[0]) &&
        remaining[1] === 'x' &&
        /^\d+$/.test(remaining[2])) {
      const firstNum = parseFloat(remaining[0]);
      const secondNum = parseFloat(remaining[2]);
      const hasBwMarker = remaining.length === 4 && remaining[3] === 'bw';
      const isJustThreeTokens = remaining.length === 3;

      // For known bodyweight exercises: always treat NUM x NUM as aggregate (at any position)
      // For unknown/weighted exercises: use heuristic ONLY at the start (startIndex === 0)
      // This ensures "squat 5x5" → aggregate at start, but later "6x30" → single set (weighted)
      const looksLikeAggregate = isBodyweightExercise ||
        (isJustThreeTokens && startIndex === 0 && firstNum <= 10 && secondNum <= 100);

      // Match if it looks like aggregate AND:
      // - Exactly 3 tokens, OR
      // - 4 tokens with "bw" marker, OR
      // - Bodyweight exercise with 4+ tokens where next token isn't "x" (e.g., "3x10 50")
      const canMatch = isJustThreeTokens || hasBwMarker ||
        (isBodyweightExercise && remaining.length > 3 && remaining[3] !== 'x');

      if (looksLikeAggregate && canMatch) {
        const tokenCount = hasBwMarker ? 4 : 3;
        return {
          type: 'aggregate',
          tokens: remaining.slice(0, tokenCount),
          startIndex,
          endIndex: startIndex + tokenCount - 1
        };
      }
    }

    // Check for multi-rep pattern: REP1 REP2 ... x WEIGHT
    const xIndex = remaining.indexOf('x');
    if (xIndex >= 2) {
      const numbersBeforeX = remaining.slice(0, xIndex).filter(t => this.isNumber(t));
      const hasWeightAfterX = xIndex < remaining.length - 1 &&
        (this.isNumber(remaining[xIndex + 1]) || remaining[xIndex + 1] === 'bw');

      if (numbersBeforeX.length >= 2 && hasWeightAfterX) {
        // Special case for bodyweight exercises: if we have "NUM NUM x NUM" at the start,
        // and the second part looks like an aggregate (NUM2 x NUM3 where NUM2 <= 10),
        // don't match multi-rep. Instead, let NUM1 be handled as reps-only.
        if (startIndex === 0 && isBodyweightExercise && xIndex === 2 &&
            this.isNumber(remaining[0]) && this.isNumber(remaining[1]) &&
            parseFloat(remaining[1]) <= 10) {
          // Skip multi-rep match, return null to let the single number be handled separately
          return null;
        }

        return {
          type: 'multi-rep',
          tokens: remaining.slice(0, xIndex + 2),
          startIndex,
          endIndex: startIndex + xIndex + 1
        };
      }
    }

    // Check for single set pattern: REPS x WEIGHT
    if (remaining.length >= 3 &&
        this.isNumber(remaining[0]) &&
        remaining[1] === 'x' &&
        (this.isNumber(remaining[2]) || remaining[2] === 'bw')) {
      return {
        type: 'single',
        tokens: remaining.slice(0, 3),
        startIndex,
        endIndex: startIndex + 2
      };
    }

    return null;
  }

  // ============================================================================
  // SET GROUP PARSING
  // ============================================================================

  /**
   * Parse all set groups into individual sets
   */
  private parseSetGroups(groups: SetGroup[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const sets: ParsedSet[] = [];

    for (const group of groups) {
      const groupSets = this.parseSetGroup(group, unitPreference, isBodyweight);

      // Renumber sets to continue from where previous groups left off
      groupSets.forEach(set => {
        sets.push({
          ...set,
          setNumber: sets.length + 1
        });
      });
    }

    return sets;
  }

  /**
   * Parse a single set group into one or more sets
   */
  private parseSetGroup(group: SetGroup, unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    switch (group.type) {
      case 'aggregate':
        return this.parseAggregateGroup(group.tokens, unitPreference, isBodyweight);
      case 'multi-rep':
        return this.parseMultiRepGroup(group.tokens, unitPreference, isBodyweight);
      case 'single':
        return this.parseSingleGroup(group.tokens, unitPreference, isBodyweight);
      case 'reps-only':
        return this.parseRepsOnlyGroup(group.tokens);
      default:
        return [];
    }
  }

  /**
   * Parse aggregate group: "3 x 5 x 135" → 3 sets of 5 reps @ 135
   */
  private parseAggregateGroup(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const numbers = tokens.filter(t => this.isNumber(t)).map(t => parseFloat(t));

    if (numbers.length < 2) return [];

    const numSets = Math.floor(numbers[0]);
    const reps = Math.floor(numbers[1]);
    const weightInfo = numbers.length >= 3
      ? this.parseWeightInfo(tokens[tokens.length - 1], unitPreference, isBodyweight)
      : { value: null, unit: null, isBodyweight: true };

    const sets: ParsedSet[] = [];
    for (let i = 0; i < numSets; i++) {
      sets.push({
        setNumber: i + 1,
        reps,
        weight: weightInfo.value,
        unit: weightInfo.unit,
        isBodyweight: weightInfo.isBodyweight
      });
    }

    return sets;
  }

  /**
   * Parse multi-rep group: "7 8 x 85" → 2 sets (7@85, 8@85)
   */
  private parseMultiRepGroup(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const xIndex = tokens.indexOf('x');
    const repsTokens = tokens.slice(0, xIndex).filter(t => this.isNumber(t));
    const weightToken = tokens[xIndex + 1];
    const weightInfo = this.parseWeightInfo(weightToken, unitPreference, isBodyweight);

    return repsTokens.map((repsToken, index) => ({
      setNumber: index + 1,
      reps: parseInt(repsToken),
      weight: weightInfo.value,
      unit: weightInfo.unit,
      isBodyweight: weightInfo.isBodyweight
    }));
  }

  /**
   * Parse single set group: "10 x 135" → 1 set of 10 reps @ 135
   */
  private parseSingleGroup(tokens: string[], unitPreference: 'kg' | 'lb', isBodyweight: boolean): ParsedSet[] {
    const reps = parseInt(tokens[0]);
    const weightToken = tokens[2];
    const weightInfo = this.parseWeightInfo(weightToken, unitPreference, isBodyweight);

    return [{
      setNumber: 1,
      reps,
      weight: weightInfo.value,
      unit: weightInfo.unit,
      isBodyweight: weightInfo.isBodyweight
    }];
  }

  /**
   * Parse reps-only group: "12 10 8" → 3 sets bodyweight
   */
  private parseRepsOnlyGroup(tokens: string[]): ParsedSet[] {
    const repsValues = tokens.filter(t => /^\d+$/.test(t)).map(t => parseInt(t));

    return repsValues.map((reps, index) => ({
      setNumber: index + 1,
      reps,
      weight: null,
      unit: null,
      isBodyweight: true
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private isNumber(token: string): boolean {
    return /^\d/.test(token);
  }

  /**
   * Parse weight token into weight info (value, unit, isBodyweight)
   */
  private parseWeightInfo(token: string, unitPreference: 'kg' | 'lb', isBodyweight: boolean): WeightInfo {
    if (token === 'bw') {
      return { value: null, unit: null, isBodyweight: true };
    }

    const match = token.match(/^(\d+(?:\.\d+)?)/);
    const value = match ? parseFloat(match[1]) : null;

    let unit: 'kg' | 'lb' | null = null;
    if (token.includes('kg')) {
      unit = 'kg';
    } else if (token.includes('lb') || token.includes('lbs')) {
      unit = 'lb';
    } else {
      unit = value !== null ? unitPreference : null;
    }

    return {
      value: isBodyweight ? null : value,
      unit: isBodyweight ? null : unit,
      isBodyweight: isBodyweight || value === null
    };
  }
}
