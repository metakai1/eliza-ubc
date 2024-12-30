# Action Runtime Extraction

This document explains how the Eliza framework extracts and processes actions from LLM responses.

## Response Format Requirements

The LLM must format its responses in a specific JSON structure that includes an `action` field:

```json
{
    "user": "agentName",
    "text": "string",
    "action": "string"
}
```

This format is enforced by appending a template to LLM prompts:
```
Response format should be formatted in a JSON block like this:
```json
{ "user": "{{agentName}}", "text": "string", "action": "string" }
```
```

## Action Detection Process

1. **JSON Parsing**
   - The runtime first checks for the presence of an `action` field in the response content
   - If found, the action name is normalized by:
     - Converting to lowercase
     - Removing underscores

2. **Action Matching**
   - The normalized action name is compared against registered actions
   - Matches can be found through:
     - Exact name match
     - Matching any of the action's similes (alternative names)

3. **Special Action Keywords**
   For certain actions (like social media interactions), the LLM must use specific bracketed keywords:
   - `[LIKE]` - Trigger a like action
   - `[RETWEET]` - Trigger a retweet action
   - `[QUOTE]` - Trigger a quote action
   - `[REPLY]` - Trigger a reply action

   These are detected using regex patterns like `/\[LIKE\]/i`

## Control Keywords

Beyond actions, the LLM can use other special keywords to control behavior:

1. **Response Control**
   - `[RESPOND]` - Indicate the agent should respond
   - `[IGNORE]` - Skip responding
   - `[STOP]` - Stop the conversation

2. **Decision Making**
   - `[YES]` - Affirmative response
   - `[NO]` - Negative response

## Example

Here's a complete example of an LLM response with an action:

```json
{
    "user": "ElizaBot",
    "text": "I'll like that post for you! [LIKE]",
    "action": "SOCIAL_ENGAGE"
}
```

This response:
1. Uses the proper JSON format
2. Includes a bracketed `[LIKE]` keyword
3. Specifies `SOCIAL_ENGAGE` as the main action

## Processing Flow

1. The runtime first extracts the main action from the JSON (`SOCIAL_ENGAGE`)
2. The action name is normalized (`socialengage`)
3. The normalized name is matched against registered actions
4. The response text is scanned for bracketed keywords (`[LIKE]`)
5. If found, corresponding boolean flags are set in the action response
6. The matched action's handler is executed with the parsed information

This structured approach ensures reliable action detection and execution while providing flexibility through the similes system and special keywords.
