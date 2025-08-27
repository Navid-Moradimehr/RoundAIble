# RoundAIble Test Cases for Bug-Fix and Code Modification Features

## Test Setup Instructions

1. **Start the Backend Server:**
   ```bash
   cd "RoundAIble - backend/backend"
   npm run build
   npm start
   ```

2. **Start the Frontend:**
   ```bash
   cd "RoundAIble - backend/frontend"
   npm run dev
   ```

3. **Configure API Keys:**
   - Open the frontend in your browser
   - Go to Settings → API Keys
   - Add your OpenAI API key for testing

## Test Case 1: New Code Request (🆕)

### Test Scenario: Create a Python CSV Parser
**Input Type:** `new-code`

**Test Data:**
- **Prompt:** "Create a Python function that parses a CSV file and returns a list of dictionaries. Use pandas if available in the project."
- **Rounds:** 2
- **Reasoning Agents:** 2 (API-based)
- **Critic Agents:** 1

**Expected Behavior:**
- ✅ Input node should accept the prompt without requiring existing code
- ✅ Workflow should execute and generate code solutions
- ✅ Live chat should show reasoning agents discussing approaches
- ✅ Final results should show multiple code solutions with scores

**Validation Steps:**
1. Create input node with `new-code` type
2. Enter the prompt above
3. Set rounds to 2
4. Connect to RoundAIble node
5. Add reasoning agents (API-based)
6. Add critic agent
7. Execute workflow
8. Verify results panel shows generated code

---

## Test Case 2: Code Modification (✏️)

### Test Scenario: Modify Existing Function
**Input Type:** `modify-code`

**Test Data:**
- **Existing Code:**
  ```python
  def calculate_average(numbers):
      total = 0
      count = 0
      for num in numbers:
          total += num
          count += 1
      return total / count
  ```
- **Modification Request:** "Add input validation to check if the list is empty and handle division by zero"
- **Rounds:** 2
- **Reasoning Agents:** 2 (API-based)
- **Critic Agents:** 1

**Expected Behavior:**
- ✅ Input node should require both existing code and modification request
- ✅ Workflow should analyze existing code and propose improvements
- ✅ Generated solutions should include input validation
- ✅ Results should show before/after code comparisons

**Validation Steps:**
1. Create input node with `modify-code` type
2. Paste existing code in "Existing Code" field
3. Enter modification request
4. Set rounds to 2
5. Connect to RoundAIble node
6. Add reasoning agents (API-based)
7. Add critic agent
8. Execute workflow
9. Verify results show improved code with validation

---

## Test Case 3: Bug Fix (🐛)

### Test Scenario: Fix Logic Error in Function
**Input Type:** `fix-bug`

**Test Data:**
- **Existing Code:**
  ```python
  def sum_even(numbers):
      total = 0
      for n in numbers:
          if n % 2 == 1:  # Bug: should be == 0 for even numbers
              total += n
      return total
  ```
- **Error Message:** "The function returns the sum of odd numbers instead of even numbers."
- **Rounds:** 2
- **Reasoning Agents:** 2 (API-based)
- **Critic Agents:** 1

**Expected Behavior:**
- ✅ Input node should require both existing code and error message
- ✅ Workflow should identify the bug (odd vs even logic)
- ✅ Generated solutions should fix the condition
- ✅ Results should show corrected code

**Validation Steps:**
1. Create input node with `fix-bug` type
2. Paste buggy code in "Existing Code" field
3. Enter error description
4. Set rounds to 2
5. Connect to RoundAIble node
6. Add reasoning agents (API-based)
7. Add critic agent
8. Execute workflow
9. Verify results show fixed code (n % 2 == 0)

---

## Test Case 4: Complex Bug Fix with Multiple Issues

### Test Scenario: Fix Multiple Bugs in Data Processing
**Input Type:** `fix-bug`

**Test Data:**
- **Existing Code:**
  ```python
  def process_user_data(users):
      results = []
      for user in users:
          name = user['name']
          age = user['age']
          email = user['email']
          
          # Bug 1: No validation for required fields
          # Bug 2: Age calculation is wrong
          # Bug 3: Email validation missing
          
          if age > 18:
              status = 'adult'
          else:
              status = 'minor'
              
          results.append({
              'name': name,
              'age': age,
              'email': email,
              'status': status
          })
      return results
  ```
- **Error Message:** "The function doesn't validate input data, has incorrect age logic, and doesn't validate email format."
- **Rounds:** 3
- **Reasoning Agents:** 3 (API-based)
- **Critic Agents:** 2

**Expected Behavior:**
- ✅ Workflow should identify multiple bugs
- ✅ Solutions should include input validation
- ✅ Age logic should be corrected
- ✅ Email validation should be added
- ✅ Results should show comprehensive fixes

---

## Test Case 5: Edge Cases and Validation

### Test Scenario: Empty Input Validation
**Input Type:** `new-code`

**Test Data:**
- **Prompt:** "" (empty)
- **Rounds:** 1

**Expected Behavior:**
- ❌ Should show validation error
- ❌ Should not allow workflow execution
- ✅ Should prompt user to enter a valid prompt

### Test Scenario: Invalid Code Syntax
**Input Type:** `modify-code`

**Test Data:**
- **Existing Code:**
  ```python
  def broken_function(
      print("This is broken"
  ```
- **Modification Request:** "Fix the syntax errors"

**Expected Behavior:**
- ✅ Workflow should execute despite syntax errors
- ✅ Reasoning agents should identify syntax issues
- ✅ Generated solutions should have correct syntax

---

## Test Case 6: Performance and Scalability

### Test Scenario: Large Code Base Modification
**Input Type:** `modify-code`

**Test Data:**
- **Existing Code:** Large Python file (500+ lines)
- **Modification Request:** "Add comprehensive error handling to all functions"

**Expected Behavior:**
- ✅ Should handle large code inputs
- ✅ Should process within reasonable time
- ✅ Should maintain code structure
- ✅ Should add error handling appropriately

---

## Test Case 7: Multi-Language Support

### Test Scenario: JavaScript Code Modification
**Input Type:** `modify-code`

**Test Data:**
- **Existing Code:**
  ```javascript
  function calculateTotal(items) {
      let total = 0;
      for (let item of items) {
          total += item.price;
      }
      return total;
  }
  ```
- **Modification Request:** "Add support for discount codes and tax calculation"

**Expected Behavior:**
- ✅ Should handle JavaScript syntax
- ✅ Should understand language-specific patterns
- ✅ Should generate appropriate JavaScript code

---

## Test Case 8: API Integration Testing

### Test Scenario: Verify API Model Selection
**Input Type:** `new-code`

**Test Data:**
- **Prompt:** "Create a simple REST API endpoint"
- **Reasoning Agents:** Configure with different models (GPT-4, GPT-3.5-turbo)
- **Critic Agents:** Configure with different models

**Expected Behavior:**
- ✅ Should use correct API models as configured
- ✅ Should not default to "gemma3:4b"
- ✅ Should show different responses for different models
- ✅ API calls should be successful

---

## Test Case 9: Workflow Execution Flow

### Test Scenario: Complete Workflow with All Node Types
**Input Type:** `fix-bug`

**Test Data:**
- **Existing Code:** Simple Python function with a bug
- **Error Message:** "Function doesn't work as expected"
- **Workflow:** Input → RoundAIble → 2 Reasoning Agents → 2 Critics → Output

**Expected Behavior:**
- ✅ All nodes should execute in correct order
- ✅ Live chat should show all agent interactions
- ✅ Final results should be comprehensive
- ✅ Export functionality should work

---

## Test Case 10: Error Handling and Recovery

### Test Scenario: API Key Issues
**Input Type:** `new-code`

**Test Data:**
- **Prompt:** "Create a simple function"
- **API Key:** Invalid or missing

**Expected Behavior:**
- ❌ Should show clear error message about API key
- ❌ Should not proceed with execution
- ✅ Should guide user to add valid API key

### Test Scenario: Network Issues
**Input Type:** `modify-code`

**Test Data:**
- **Existing Code:** Simple function
- **Modification Request:** "Add error handling"
- **Network:** Simulate network failure

**Expected Behavior:**
- ❌ Should handle network errors gracefully
- ❌ Should show appropriate error message
- ✅ Should allow retry functionality

---

## Success Criteria

A test is considered **PASSED** if:
1. ✅ Input validation works correctly for each input type
2. ✅ Workflow execution completes without errors
3. ✅ Generated code is syntactically correct
4. ✅ Bug fixes actually resolve the reported issues
5. ✅ Code modifications address the requested changes
6. ✅ Live chat shows meaningful agent interactions
7. ✅ Results panel displays comprehensive output
8. ✅ Export functionality works
9. ✅ API model selection works correctly
10. ✅ Error handling is appropriate

## Reporting Issues

If any test fails, please report:
1. **Test Case Number** and **Scenario**
2. **Expected vs Actual Behavior**
3. **Steps to Reproduce**
4. **Error Messages** (if any)
5. **Browser Console Logs**
6. **Backend Server Logs**

## Performance Benchmarks

- **Workflow Execution Time:** Should complete within 30-60 seconds for simple cases
- **API Response Time:** Should be under 10 seconds per agent
- **Memory Usage:** Should not exceed 500MB for typical workflows
- **Concurrent Users:** Should support at least 5 concurrent workflow executions 