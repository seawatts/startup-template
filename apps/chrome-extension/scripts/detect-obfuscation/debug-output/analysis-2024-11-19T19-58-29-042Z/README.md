
# Obfuscation Analysis Results

Generated on: 11/19/2024, 11:59:13 AM

## Summary
- Total suspicious files: 6
- Total packages with obfuscation: 4
- Total files affected: 12

## Directory Structure

- `summary.json` - Overview of all findings
- `{package-name}/` - Directory for each detected package
  - `package-analysis.json` - Package-level analysis
  - `{file-name}.annotated.js` - Formatted source with annotations
  - `{file-name}.analysis.json` - Detailed match information

## How to Review

1. Start with `summary.json` to get an overview
2. For each package of interest:
   - Check `package-analysis.json` for package-level insights
   - Review `.annotated.js` files to see the code with annotations
   - Check `.analysis.json` files for detailed pattern matches

## Known Packages

- react
- react-dom
- lodash
- jquery
- moment
- axios
- rrweb

## Recommendations

- Focus on files in the "unknown" package first
- Review eval usage patterns carefully
- Check long variable names in non-minified files
