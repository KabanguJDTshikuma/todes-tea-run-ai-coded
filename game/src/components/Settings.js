export class Settings {
  constructor({ sound, renderer, hitEffects, impact, onOpen }) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'settings-button';
    this.button.textContent = 'Settings';
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'settings-dialog';
    this.dialog.setAttribute('aria-labelledby', 'settings-title');
    const title = document.createElement('h2');
    title.id = 'settings-title';
    title.textContent = 'Settings';
    const note = document.createElement('p');
    note.textContent = 'Changes apply immediately and last until you reload. Close settings, then Resume to continue a paused run.';
    this.dialog.append(title, note);

    this.mute = this.addCheckbox('Mute sound', sound.muted, () => {
      if (this.mute.checked !== sound.muted) {
        sound.toggleMute();
      }
    });
    const volumeLabel = document.createElement('label');
    volumeLabel.className = 'settings-field';
    const volumeText = document.createElement('span');
    volumeText.textContent = 'Sound volume';
    this.volume = document.createElement('input');
    this.volume.type = 'range';
    this.volume.min = '0';
    this.volume.max = '100';
    this.volume.step = '1';
    this.volume.value = String(sound.volume * 100);
    const volumeValue = document.createElement('output');
    this.volume.id = 'sound-volume';
    volumeValue.htmlFor = this.volume.id;
    volumeValue.value = `${this.volume.value}%`;
    this.volume.addEventListener('input', () => {
      sound.setVolume(Number(this.volume.value) / 100);
      volumeValue.value = `${this.volume.value}%`;
    });
    volumeLabel.append(volumeText, this.volume, volumeValue);
    this.dialog.append(volumeLabel);
    this.addCheckbox('Shadows', renderer.shadowMap.enabled, (event) => {
      renderer.shadowMap.enabled = event.target.checked;
      renderer.shadowMap.needsUpdate = true;
    });
    this.addCheckbox('Hit particles', hitEffects.enabled, (event) => {
      hitEffects.setEnabled(event.target.checked);
    });
    this.addCheckbox('Screen shake', impact.shakeEnabled, (event) => {
      impact.setShakeEnabled(event.target.checked);
    });
    const motionNote = document.createElement('p');
    motionNote.textContent = 'Your device reduced-motion preference also disables hit particles and screen shake. Attack and boss warning visuals remain visible.';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close settings';
    close.addEventListener('click', () => this.dialog.close());
    this.dialog.append(motionNote, close);
    this.button.addEventListener('click', () => {
      onOpen();
      this.mute.checked = sound.muted;
      this.mute.disabled = sound.failed;
      this.volume.disabled = sound.failed;
      this.dialog.showModal();
    });
    this.dialog.addEventListener('close', () => this.button.focus());
    document.body.append(this.button, this.dialog);
  }

  addCheckbox(text, checked, onChange) {
    const label = document.createElement('label');
    label.className = 'settings-field';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', onChange);
    label.append(input, document.createTextNode(text));
    this.dialog.append(label);
    return input;
  }

  get open() {
    return this.dialog.open;
  }
}
