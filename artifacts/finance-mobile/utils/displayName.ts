type ClerkUserLike = {
  firstName?: string | null;
  fullName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ emailAddress?: string | null }> | null;
} | null | undefined;

/**
 * Best-effort display name for a Clerk user. Most sign-ups here are
 * email+password only (no first/last name or username collected), so without
 * this every greeting/profile name would show a generic fallback for nearly
 * every account. Derives a readable name from the email's local part
 * (e.g. "jane.doe" -> "Jane Doe") before giving up to `fallback`.
 */
export function displayNameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0];
  if (!local) return null;
  return local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function getDisplayName(user: ClerkUserLike, fallback = "Friend"): string {
  if (user?.firstName) return user.firstName;
  if (user?.fullName) return user.fullName;
  if (user?.username) return user.username;
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  return displayNameFromEmail(email) ?? fallback;
}
