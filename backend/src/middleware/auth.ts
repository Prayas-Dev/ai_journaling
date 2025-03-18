
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";

console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails?.[0]?.value) {
          return done(new Error("No email found"), undefined);
        }

        const payload = {
          id: profile.id,
          email: profile.emails[0].value,
        };

        // Generate a JWT token
        const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1h" });

        // Attach token to the user object
        return done(null, { ...payload, token });
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;
