import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

// 1. Extend the User type returned by the authorize function
declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string; 
  }

  // 2. Extend the Session type to include the extended User
  interface Session extends DefaultSession {
    user: {
      id: string; 
    } & DefaultSession['user'];
  }
}

// 3. Extend the JWT type to include the custom properties
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string; 
    email: string;
  }
}