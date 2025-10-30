/**
 * HTML Table to Markdown Converter (Browser-Compatible)
 * Adapted from urltomarkdown/html_table_to_markdown.js
 * 
 * Features:
 * - Browser-native HTML entity decoding
 * - Width calculation and cell padding
 * - Automatic fallback to indented list when table is too wide
 * - Caption extraction
 * - Header row detection
 */

class HTMLTableConverter {
  constructor(maxWidth = 96) {
    this.maxWidth = maxWidth;
  }
  
  /**
   * Browser-native HTML entity decoder
   * Replaces html-entities library with DOM-based decoding
   */
  decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
  
  /**
   * Simple left-justify padding (replaces justify-text library)
   * Uses native String.prototype.padEnd()
   */
  padEnd(str, length) {
    return str.padEnd(length, ' ');
  }
  
  /**
   * Clean HTML content
   * Removes HTML tags, normalizes whitespace, decodes entities
   */
  clean(str) {
    str = str.replace(/<\/?[^>]+(>|$)/g, "");
    str = str.replace(/(\r\n|\n|\r)/gm, "");
    str = this.decodeHTMLEntities(str);
    return str;
  }
  
  /**
   * Convert HTML table to markdown
   * Main conversion method with width calculation and fallback logic
   */
  convert(tableHTML) {
    let result = "\n";

    // Extract caption
    let caption = tableHTML.match(/<caption[^>]*>((?:.|\n)*)<\/caption>/i);
    if (caption) {
      result += this.clean(caption[1]) + "\n\n";
    }

    let items = [];

    // Collect data from table rows
    let rows = tableHTML.match(/(<tr[^>]*>(?:.|\n)*?<\/tr>)/gi);

    // Check if this is a proper table
    let n_rows = rows?.length ?? 0;
    if (n_rows < 2) {
      return "";
    }

    // Parse each row
    for (let r = 0; r < n_rows; r++) {
      let item_cols = [];
      let cols = rows[r].match(/<t[h|d][^>]*>(?:.|\n)*?<\/t[h|d]>/gi);
      for (let c = 0; c < cols.length; c++) {
        item_cols.push(this.clean(cols[c]));
      }
      items.push(item_cols);
    }

    // Find number of columns
    let n_cols = 0;
    for (let r = 0; r < n_rows; r++) {
      if (items[r].length > n_cols) {
        n_cols = items[r].length;
      }
    }

    // Normalize columns (fill missing cells)
    for (let r = 0; r < n_rows; r++) {
      for (let c = 0; c < n_cols; c++) {
        if (typeof items[r][c] === "undefined") {
          items[r].push("");
        }
      }
    }

    // Calculate column widths
    let column_widths = [];
    for (let c = 0; c < n_cols; c++) {
      column_widths.push(3); // Minimum width
    }
    
    for (let r = 0; r < n_rows; r++) {
      for (let c = 0; c < n_cols; c++) {
        let l = items[r][c].length;
        if (l > column_widths[c]) {
          column_widths[c] = l;
        }
      }
    }

    // Calculate total width
    let total_width = 0;
    for (let c = 0; c < n_cols; c++) {
      total_width = total_width + column_widths[c];
    }

    // Decide presentation format based on width
    if (total_width < this.maxWidth) {
      // Present as markdown table
      return this.renderAsTable(items, column_widths, n_rows, n_cols, result);
    } else {
      // Present as indented list
      return this.renderAsList(items, n_rows, n_cols, result);
    }
  }

  /**
   * Render table as markdown table format
   */
  renderAsTable(items, column_widths, n_rows, n_cols, result) {
    // Pad cells for alignment
    for (let r = 0; r < n_rows; r++) {
      for (let c = 0; c < n_cols; c++) {
        items[r][c] = this.padEnd(items[r][c], column_widths[c]);
      }
    }

    if (n_rows > 0 && n_cols > 0) {
      // Header row
      if (n_rows > 1) {
        result += "|";
        for (let c = 0; c < n_cols; c++) {
          result += items[0][c];
          result += "|";
        }
      }
      result += "\n";
      
      // Separator row
      result += "|";
      for (let c = 0; c < n_cols; c++) {
        result += "-".repeat(column_widths[c]) + "|";
      }
      result += "\n";
      
      // Data rows
      for (let r = 1; r < n_rows; r++) {
        result += "|";
        for (let c = 0; c < n_cols; c++) {
          result += items[r][c];
          result += "|";
        }
        result += "\n";
      }
    }

    return result;
  }

  /**
   * Render table as indented list format
   * Used when table is too wide for markdown table format
   */
  renderAsList(items, n_rows, n_cols, result) {
    result += "\n";
    
    for (let r = 1; r < n_rows; r++) {
      // Main item (first column)
      if (items[0][0] || items[r][0]) {
        result += "* ";
      }
      if (items[0][0]) {
        result += items[0][0];
        result += ": ";
      }
      if (items[r][0]) {
        result += items[r][0];
      }
      if (items[0][0] || items[r][0]) {
        result += "\n";
      }
      
      // Sub-items (remaining columns)
      for (let c = 1; c < n_cols; c++) {
        if (items[0][c] || items[r][c]) {
          result += "  * ";
        }
        if (items[0][c]) {
          result += items[0][c];
          result += ": ";
        }
        if (items[r][c]) {
          result += items[r][c];
        }
        if (items[0][c] || items[r][c]) {
          result += "\n";
        }
      }
    }

    return result;
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.HTMLTableConverter = HTMLTableConverter;
}

// Export for Node.js use (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLTableConverter;
}












