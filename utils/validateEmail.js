// Known disposable/fake email domains to block
const BLOCKED_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "dispostable.com",
  "mailnull.com",
  "spamgourmet.com",
  "tempr.email",
  "discard.email",
  "spamfree24.org",
  "fakeinbox.com",
  "mailnesia.com",
  "maildrop.cc",
  "spamboy.com",
  "spamex.com",
  "spamhereplease.com",
  "spammotel.com",
  "spam.la",
  "binkmail.com",
  "safetymail.info",
  "tempomail.fr",
  "throwam.com",
  "spamstack.net",
  "haltospam.com",
];

// Basic format regex
const FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmailFormat = (email) => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();

  // Must pass format check
  if (!FORMAT_REGEX.test(trimmed)) return false;

  // Must have a real TLD (at least 2 chars, not all numbers)
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;

  const domain = parts[1];
  const tldPart = domain.split(".").pop();
  if (!tldPart || tldPart.length < 2 || /^\d+$/.test(tldPart)) return false;

  // Block disposable domains
  if (BLOCKED_DOMAINS.includes(domain)) return false;

  return true;
};
