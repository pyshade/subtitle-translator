# CLI Interface Guidelines

## Command Design Principles
- **Intuitive commands**: Use clear, descriptive command names that match user intent
- **Consistent options**: Use standard CLI conventions (-h for help, -v for verbose, etc.)
- **Sensible defaults**: Provide reasonable default values that work for most use cases
- **Progressive disclosure**: Basic commands should be simple, advanced options available when needed

## Command Structure
```bash
subtitle-translator <command> [arguments] [options]
```

### Available Commands
- `translate <input>` - Main translation command for files or directories
- `detect <file>` - Utility to identify subtitle format
- `list-methods` - Information command to show available translation services
- `config` - Configuration management command

## Option Patterns
- **Short and long forms**: Provide both `-t` and `--target` for common options
- **Type safety**: Validate option values and provide clear error messages
- **Configuration precedence**: CLI options > config file > defaults

## Error Handling Strategy
- **Graceful degradation**: Continue processing other files if one fails
- **Detailed logging**: Provide clear error messages with context
- **Exit codes**: Use standard exit codes (0 = success, 1 = error)
- **Progress reporting**: Show translation progress for batch operations

## Configuration Management
- **JSON configuration files**: Use standard JSON format for configuration
- **Template generation**: Provide `config` command to generate configuration templates
- **Environment variables**: Support common environment variables for API keys
- **Validation**: Validate configuration files and provide helpful error messages

## Translation Service Integration
- **Service abstraction**: Abstract translation services behind a common interface
- **Rate limiting**: Implement delays and limits to respect API rate limits
- **Caching**: Cache translations to avoid redundant API calls
- **Fallback handling**: Gracefully handle API failures and provide alternatives

## File Processing
- **Format detection**: Automatically detect subtitle formats
- **Batch processing**: Handle multiple files and directories efficiently
- **Output management**: Create output directories as needed
- **Encoding support**: Handle different text encodings properly

## Testing Strategy
- **Unit tests**: Test individual functions and utilities
- **Integration tests**: Test complete workflows end-to-end
- **Example files**: Provide sample subtitle files for testing
- **Automated testing**: Include CLI testing in CI/CD pipeline

## Documentation Standards
- **Inline help**: Provide comprehensive help text for all commands and options
- **Examples**: Include practical examples in help text and documentation
- **README**: Maintain detailed CLI-specific README with usage examples
- **Error messages**: Write clear, actionable error messages

## Performance Considerations
- **Parallel processing**: Process multiple files concurrently when possible
- **Memory efficiency**: Stream large files instead of loading entirely into memory
- **Progress indicators**: Show progress for long-running operations
- **Interruption handling**: Handle Ctrl+C gracefully and clean up resources

## Security Guidelines
- **API key handling**: Never log or expose API keys in output
- **File permissions**: Respect file system permissions and provide clear errors
- **Input validation**: Validate all user inputs to prevent injection attacks
- **Temporary files**: Clean up temporary files after processing