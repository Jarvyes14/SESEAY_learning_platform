export function publicUser(user) {
  const serialized = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    role: user.role?.name,
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug
        }
      : null,
    createdAt: user.createdAt
  };

  if (user.sessions) {
    serialized.lastAccessAt = user.sessions[0]?.lastSeenAt ?? null;
    serialized.recentAccesses = user.sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      signedInAt: session.createdAt,
      lastSeenAt: session.lastSeenAt
    }));
  }

  return serialized;
}

export function publicSession(session, currentSessionId) {
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    current: session.id === currentSessionId
  };
}
