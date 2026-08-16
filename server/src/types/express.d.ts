// Type augmentation for Express's Request.
//
// requireAuth attaches the authenticated user id to the request, and this is
// what makes it visible to every downstream handler without an `as any` cast
// at each use site. It is declared optional because the augmentation applies to
// every Request in the app, including the ones that never pass through
// requireAuth — a required field would be a lie on unprotected routes.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
