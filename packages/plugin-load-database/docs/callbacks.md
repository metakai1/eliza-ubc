# Callback Usage Guide for Eliza Plugins

## Overview
Callbacks in Eliza plugins are used to provide real-time feedback and updates to users during long-running operations. The `HandlerCallback` type is a function that takes a `Content` object and an optional array of files.

## Callback Structure
```typescript
type HandlerCallback = (
    response: Content,
    files?: { attachment: string; name: string; }[]
) => Promise<Memory[]>;
```

## Best Practices

1. **Always Await Callbacks**
   ```typescript
   await callback({
       text: "Operation in progress...",
       content: { text: "Operation in progress..." }
   }, []);
   ```

2. **Progress Updates**
   - Send immediate feedback when starting long operations
   - Update on significant steps
   - Provide final results
   ```typescript
   // Initial feedback
   await callback({ text: "Starting process..." }, []);
   
   // During operation
   await callback({ text: "Step 1 complete..." }, []);
   
   // Final result
   await callback({ text: "Operation complete!" }, []);
   ```

3. **Error Handling**
   ```typescript
   try {
       // Operation
   } catch (error) {
       await callback({
           text: "Error occurred: " + error.message,
           content: { text: "Error occurred: " + error.message }
       }, []);
       return false;
   }
   ```

4. **File Attachments**
   ```typescript
   await callback({
       text: "Generated file",
       attachments: [{
           id: "unique-id",
           url: filepath,
           title: "Title",
           contentType: "image"
       }]
   }, [{
       attachment: filepath,
       name: filename
   }]);
   ```

5. **Return Values**
   - Return `true` for successful completion
   - Return `false` for failures
   - Always call callback before returning

## Common Patterns

1. **Progress Updates Pattern**
```typescript
if (callback) {
    await callback({
        text: "Operation starting...",
        content: { text: "Operation starting..." }
    }, []);
}

// Perform operation

if (callback) {
    await callback({
        text: "Operation complete",
        content: { text: "Operation complete" }
    }, []);
}

return true;
```

2. **Error Handling Pattern**
```typescript
try {
    // Operation
    return true;
} catch (error) {
    elizaLogger.error('[Action] error:', error);
    if (callback) {
        await callback({
            text: "Error occurred",
            content: { text: "Error occurred" }
        }, []);
    }
    return false;
}
```

## Important Notes
1. Always check if callback exists before calling (`if (callback)`)
2. Always await callback calls
3. Include both text and content in response
4. Return appropriate boolean values
5. Use callbacks for user feedback, not just final results

## Example Implementation in Load Database Plugin

Here's how callbacks are used in the Save Memory action:

```typescript
handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: SaveMemoryState,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
) => {
    try {
        // Initial progress update
        if (callback) {
            await callback({
                text: "Summary in progress...",
                content: { text: "Summary in progress..." }
            }, []);
        }

        // Perform operation
        const savedKnowledge = await generateText({...});

        if (!savedKnowledge) {
            if (callback) {
                await callback({
                    text: "No information to save",
                    content: { text: "No information to save" }
                }, []);
            }
            return false;
        }

        // Save to knowledge base
        await knowledge.set(runtime as AgentRuntime, memoryToSave);

        // Final success update
        if (callback) {
            await callback({
                text: `Saved: "${savedKnowledge}"`,
                content: { text: `Saved: "${savedKnowledge}"` }
            }, []);
        }

        return true;
    } catch (error) {
        // Error handling
        elizaLogger.error('[Action] error:', error);
        if (callback) {
            await callback({
                text: "Error saving information",
                content: { text: "Error saving information" }
            }, []);
        }
        return false;
    }
}
```

This example demonstrates proper callback usage with progress updates, error handling, and appropriate return values.
