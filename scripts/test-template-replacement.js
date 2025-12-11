// /home/nneessen/projects/commissionTracker/scripts/test-template-replacement.js
// Test script to verify template variable replacement logic

/**
 * Simulates the replaceTemplateVariables function from the edge function
 */
function replaceTemplateVariables(text, variables) {
  let result = text;

  // Replace {{variable}} format
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'gi');
    result = result.replace(regex, value);
  });

  // Also support {variable} format for backward compatibility
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}`, 'gi');
    result = result.replace(regex, value);
  });

  return result;
}

// Test template with various variable formats
const testTemplate = `
Hello {{recruit_first_name}},

Thank you for your interest in joining {{company_name}}!

Your details:
- Name: {{recruit_first_name}} {{recruit_last_name}}
- Email: {{recruit_email}}
- Phone: {{recruit_phone}}
- Status: {{recruit_status}}

From {{user_first_name}} {{user_last_name}}
{{user_email}}

Today's date: {{date_today}}
Workflow: {{workflow_name}}
`;

// Test variables with UNDERSCORE format (matching what edge function sets)
const testVariables = {
  'recruit_first_name': 'John',
  'recruit_last_name': 'Doe',
  'recruit_email': 'john.doe@example.com',
  'recruit_phone': '555-0123',
  'recruit_status': 'Active',
  'company_name': 'ABC Insurance Agency',
  'user_first_name': 'Sarah',
  'user_last_name': 'Smith',
  'user_email': 'sarah@agency.com',
  'date_today': new Date().toLocaleDateString(),
  'workflow_name': 'New Recruit Welcome'
};

console.log('🧪 Testing Template Variable Replacement');
console.log('========================================\n');

console.log('📝 Original Template:');
console.log(testTemplate);

console.log('\n📦 Variables:');
Object.entries(testVariables).forEach(([key, value]) => {
  console.log(`  ${key}: "${value}"`);
});

const result = replaceTemplateVariables(testTemplate, testVariables);

console.log('\n✅ Result After Replacement:');
console.log(result);

// Check if any unreplaced tags remain
const unreplacedTags = result.match(/{{[^}]+}}/g) || [];
if (unreplacedTags.length > 0) {
  console.log('\n❌ ERROR: Unreplaced template tags found:');
  unreplacedTags.forEach(tag => console.log(`  - ${tag}`));
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All template variables replaced correctly!');
}

// Test with old DOT format to show it DOESN'T work
console.log('\n\n🧪 Testing with OLD DOT FORMAT (should fail):');
console.log('=============================================\n');

const oldVariables = {
  'recruit.first_name': 'John',
  'recruit.last_name': 'Doe',
  'recruit.email': 'john.doe@example.com',
  'company_name': 'ABC Insurance Agency'
};

const oldResult = replaceTemplateVariables(testTemplate, oldVariables);
const oldUnreplacedTags = oldResult.match(/{{[^}]+}}/g) || [];

if (oldUnreplacedTags.length > 0) {
  console.log('❌ As expected, DOT format variables do NOT match underscore template tags:');
  oldUnreplacedTags.forEach(tag => console.log(`  - ${tag} was not replaced`));
} else {
  console.log('⚠️ Unexpected: All tags were replaced with dot format (this shouldn\'t happen)');
}

console.log('\n📊 Summary:');
console.log('- Template tags use UNDERSCORES: {{recruit_first_name}}');
console.log('- Edge function now sets variables with UNDERSCORES: recruit_first_name');
console.log('- This ensures proper template replacement!');