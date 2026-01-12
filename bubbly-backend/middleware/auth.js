function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireBubbleMember(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // This middleware expects the bubbleId to be in req.params.id
  // In production, you'd check if the user is a member of this bubble
  next();
}

module.exports = { requireAuth, requireBubbleMember };