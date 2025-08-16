const { Exercise, ExerciseAlias } = require('../models');

class WorkoutParser {
  constructor() {
    this.warnings = [];
    this.tokens = [];
  }

  // Main parsing function
  async parseWorkoutText(text, unitPreference = 'lb') {
    this.warnings = [];
    this.tokens = [];
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const exercises = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (!line) continue;
      
      try {
        const parsedExercise = await this.parseLine(line, lineIndex + 1, unitPreference);
        if (parsedExercise) {
          exercises.push(parsedExercise);
        }
      } catch (error) {
        this.warnings.push({
          line: lineIndex + 1,
          message: `Failed to parse line: ${error.message}`,
          originalText: line
        });
      }
    }
    
    return {
      exercises,
      warnings: this.warnings,
      tokens: this.tokens
    };
  }

  // Parse a single line
  async parseLine(line, lineNumber, unitPreference) {
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
    
    // Find or suggest exercise
    const exercise = await this.findExercise(exerciseName);
    if (!exercise) {
      this.warnings.push({
        line: lineNumber,
        message: `Unknown exercise: ${exerciseName}`,
        suggestion: 'Add to exercise database or use alias',
        originalText: line
      });
      return null;
    }

    // Determine parsing mode and parse sets
    const mode = this.detectParsingMode(setTokens);
    const sets = this.parseSets(setTokens, mode, unitPreference, exercise.isBodyweight);
    
    if (sets.length === 0) {
      this.warnings.push({
        line: lineNumber,
        message: 'No valid sets found',
        originalText: line
      });
      return null;
    }

    return {
      exercise: {
        id: exercise._id,
        name: exercise.canonicalName,
        category: exercise.category,
        isBodyweight: exercise.isBodyweight
      },
      sets,
      mode,
      originalText: line
    };
  }

  // Tokenize line into words/numbers
  tokenizeLine(line) {
    return line
      .toLowerCase()
      .replace(/[,;]/g, ' ') // Replace separators with spaces
      .replace(/(\d+)x(\d+)x(\d+)/g, '$1 x $2 x $3') // Split 3x5x135 -> 3 x 5 x 135
      .replace(/(\d+)x(\d+)/g, '$1 x $2') // Split 3x5 -> 3 x 5
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  // Extract exercise name from tokens
  extractExerciseName(tokens) {
    const nameTokens = [];
    for (const token of tokens) {
      // Stop when we hit a number or 'x'
      if (/^\d/.test(token) || token === 'x') {
        break;
      }
      nameTokens.push(token);
    }
    return nameTokens.join(' ');
  }

  // Find exercise by name or alias
  async findExercise(name) {
    // Try exact match first
    let exercise = await Exercise.findOne({ 
      canonicalName: new RegExp(`^${name}$`, 'i') 
    });
    
    if (!exercise) {
      // Try alias match
      const alias = await ExerciseAlias.findOne({ 
        alias: new RegExp(`^${name}$`, 'i') 
      }).populate('exerciseId');
      
      if (alias) {
        exercise = alias.exerciseId;
      }
    }
    
    return exercise;
  }

  // Detect parsing mode based on tokens
  detectParsingMode(tokens) {
    const hasXPattern = tokens.includes('x');
    const numberTokens = tokens.filter(t => /^\d/.test(t));
    
    // Check for aggregate pattern: SETS x REPS x WEIGHT
    if (hasXPattern && numberTokens.length >= 2) {
      const xIndices = tokens.map((t, i) => t === 'x' ? i : -1).filter(i => i !== -1);
      if (xIndices.length >= 2) {
        return 'aggregate';
      }
      // Check for SETS x REPS pattern
      if (xIndices.length === 1 && numberTokens.length >= 2) {
        return 'aggregate';
      }
    }
    
    // Check for per-set pattern: multiple REPS x WEIGHT tokens
    if (hasXPattern && this.countPerSetTokens(tokens) >= 2) {
      return 'per-set';
    }
    
    // Default to reps-only (bodyweight)
    return 'reps-only';
  }

  // Count per-set tokens (REPS x WEIGHT patterns)
  countPerSetTokens(tokens) {
    let count = 0;
    for (let i = 0; i < tokens.length - 2; i++) {
      if (/^\d/.test(tokens[i]) && tokens[i + 1] === 'x' && /^\d/.test(tokens[i + 2])) {
        count++;
      }
    }
    return count;
  }

  // Parse sets based on mode
  parseSets(tokens, mode, unitPreference, isBodyweight) {
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

  // Parse aggregate format: 3x5x135 or 3x5
  parseAggregateSets(tokens, unitPreference, isBodyweight) {
    const numbers = tokens.filter(t => /^\d/.test(t)).map(t => parseFloat(t));
    const hasBodyweight = tokens.includes('bw');
    
    if (numbers.length < 2) return [];
    
    const sets = parseInt(numbers[0]);
    const reps = parseInt(numbers[1]);
    const weight = numbers.length >= 3 ? numbers[2] : null;
    
    const result = [];
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

  // Parse per-set format: 10x40kg 10x45kg 8x45kg
  parsePerSetSets(tokens, unitPreference, isBodyweight) {
    const sets = [];
    let setNumber = 1;
    
    for (let i = 0; i < tokens.length - 2; i++) {
      if (/^\d/.test(tokens[i]) && tokens[i + 1] === 'x') {
        const reps = parseInt(tokens[i]);
        const weightToken = tokens[i + 2];
        
        let weight = null;
        let unit = null;
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
  parseRepsOnlySets(tokens) {
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
  parseWeight(token) {
    const match = token.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  // Extract unit from token
  extractUnit(token) {
    if (token.includes('kg')) return 'kg';
    if (token.includes('lb') || token.includes('lbs')) return 'lb';
    return null;
  }
}

module.exports = WorkoutParser;