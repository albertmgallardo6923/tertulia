#!/bin/bash
# Deja pasar solo los fallos de los tests para no llenar el contexto.
# Basado en el ejemplo de https://code.claude.com/docs/en/costs
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

pattern='^(npm test|npm run test(:[a-z0-9-]+)?|npx vitest( run)?|npx playwright test)( [^;&|<>`$#\\[:cntrl:]]*)?$'
if [[ "$cmd" =~ $pattern ]]; then
  filtered_cmd="$cmd 2>&1 | grep -A 8 -E '(FAIL|✗|×|Error|error:|failed)' | head -120; echo \"[exit: \${PIPESTATUS[0]}]\""
  echo "$input" | jq --arg filtered "$filtered_cmd" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", updatedInput: (.tool_input + {command: $filtered})}}'
else
  echo "{}"
fi
