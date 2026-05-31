/**
 * Type-safe wrapper for Rybbit Analytics
 * This allows us to track custom events and identify users across the ICPC HUE platform.
 */

interface RybbitWindow extends Window {
  rybbit?: {
    track: (eventName: string, properties?: Record<string, any>) => void;
    identify: (userId: string, traits?: Record<string, any>) => void;
  };
}

declare const window: RybbitWindow;

export const analytics = {
  /**
   * Track a custom event
   * @param eventName Name of the event (e.g., 'session_joined', 'problem_solved')
   * @param properties Optional metadata for the event
   */
  track: (eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.rybbit) {
      window.rybbit.track(eventName, properties);
    }
  },

  /**
   * Identify a user with a unique ID and optional traits
   * @param userId The user's unique identifier (e.g., Supabase ID)
   * @param traits Optional user properties (e.g., { email: 'user@example.com', level: 'beginner' })
   */
  identify: (userId: string, traits?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.rybbit) {
      window.rybbit.identify(userId, traits);
    }
  },
};
