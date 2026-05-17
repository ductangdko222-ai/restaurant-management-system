export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};
