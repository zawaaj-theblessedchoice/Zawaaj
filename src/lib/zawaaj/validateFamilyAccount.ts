export type FamilyAccountInput = {
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name?: string | null
  female_contact_number?: string | null
  father_explanation?: string | null
  no_female_contact_flag?: boolean
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Record<string, string> }

const MALE_RELATIONSHIPS = ['father', 'male_guardian']

export function validateFamilyAccount(input: FamilyAccountInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.contact_full_name?.trim())
    errors.contact_full_name = 'Please enter the full name of the primary contact'

  if (!input.contact_relationship?.trim())
    errors.contact_relationship = 'Please select a relationship'

  if (!input.contact_number?.trim())
    errors.contact_number = 'Please enter a contact number'

  if (!input.contact_email?.trim())
    errors.contact_email = 'Please enter a valid email address'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email.trim()))
    errors.contact_email = 'Please enter a valid email address'

  const isMale = MALE_RELATIONSHIPS.includes(input.contact_relationship ?? '')

  if (isMale && !input.no_female_contact_flag) {
    if (!input.female_contact_name?.trim())
      errors.female_contact_name = 'Please enter the name of the female contact'
    if (!input.female_contact_number?.trim())
      errors.female_contact_number = "Please enter the female contact's number"
  }

  if (input.no_female_contact_flag && !input.father_explanation?.trim())
    errors.father_explanation = 'Please explain why no female contact is available'

  return Object.keys(errors).length === 0
    ? { valid: true }
    : { valid: false, errors }
}
