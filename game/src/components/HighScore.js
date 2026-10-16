const STORAGE_KEY = 'tode.highScore';

export class HighScore {
  constructor(onStorageError) {
    this.value = 0;
    this.storageAvailable = true;
    this.onStorageError = onStorageError;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        const value = Number(saved);

        if (!/^\d+$/.test(saved) || !Number.isSafeInteger(value) || value < 0) {
          throw new Error('Saved high score is not a valid nonnegative integer.');
        }

        this.value = value;
      }
    } catch (error) {
      this.reportStorageError(error);
    }
  }

  record(score) {
    const value = Math.floor(score);

    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('High score must be a nonnegative safe integer.');
    }

    if (value <= this.value) {
      return;
    }

    this.value = value;

    if (this.storageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(this.value));
      } catch (error) {
        this.reportStorageError(error);
      }
    }
  }

  reportStorageError(error) {
    this.storageAvailable = false;
    console.warn('High-score storage is unavailable.', error);
    this.onStorageError();
  }
}
