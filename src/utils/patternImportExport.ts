// Import/Export patterns as JSON files

import { Pattern } from '../types/pattern';

/**
 * Export pattern as JSON file
 */
export function exportPatternAsJSON(pattern: Pattern): void {
  const json = JSON.stringify(pattern, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${pattern.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  console.log('Pattern exported:', pattern.name);
}

/**
 * Import pattern from JSON file
 */
export function importPatternFromJSON(file: File): Promise<Pattern> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const pattern = JSON.parse(json) as Pattern;

        // Validate pattern structure
        if (!pattern.id || !pattern.name || !pattern.tracks) {
          throw new Error('Invalid pattern file structure');
        }

        // Generate new ID for imported pattern
        pattern.id = crypto.randomUUID();
        pattern.created = Date.now();
        pattern.name = `${pattern.name} (imported)`;

        console.log('Pattern imported:', pattern.name);
        resolve(pattern);
      } catch (error) {
        console.error('Failed to parse pattern JSON:', error);
        reject(new Error('Invalid pattern file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate pattern data
 */
export function validatePattern(pattern: any): pattern is Pattern {
  return (
    typeof pattern === 'object' &&
    typeof pattern.id === 'string' &&
    typeof pattern.name === 'string' &&
    typeof pattern.bpm === 'number' &&
    typeof pattern.swing === 'number' &&
    Array.isArray(pattern.tracks) &&
    pattern.tracks.length === 8
  );
}
