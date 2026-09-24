const ERROR_MESSAGES: Record<string, string> = {
  company_name_required: "Company name is required",
  contact_name_required: "Contact name is required",
  contact_email_invalid: "A valid email is required",
  contact_phone_invalid: "Phone must be exactly 8 digits",
  address_required: "Address is required",
  zip_code_invalid: "Postcode must be 4–5 digits",
  city_required: "City is required",
  cvr_invalid: "CVR must be exactly 8 digits",
  consent_required: "You must accept the privacy terms",
  website_url_invalid: "Enter a valid website (e.g. website.com or www.website.com)",
  pending_application_exists: "An application with this email is already pending",
  rate_limited: "Too many requests. Please try again later.",
}

export function onboardingErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? "Invalid request"
}
