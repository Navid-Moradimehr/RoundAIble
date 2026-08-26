const FLAG = 'roundaible_onboarded_v1';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return true;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* ignore */
  }
}
