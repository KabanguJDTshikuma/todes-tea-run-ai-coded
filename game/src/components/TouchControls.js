export class TouchControls {
  constructor(onMove, onAttack) {
    this.element = document.createElement('div');
    this.element.className = 'touch-controls';
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Touch game controls');
    this.element.hidden = true;

    const directions = document.createElement('div');
    directions.className = 'touch-directions';
    directions.setAttribute('role', 'group');
    directions.setAttribute('aria-label', 'Movement');

    for (const [key, label, symbol, position] of [
      ['ArrowUp', 'Hop forward', '^', 'up'],
      ['ArrowLeft', 'Hop left', '<', 'left'],
      ['ArrowDown', 'Hop backward', 'v', 'down'],
      ['ArrowRight', 'Hop right', '>', 'right'],
    ]) {
      const button = this.createButton(symbol, label, () => onMove(key));
      button.classList.add(`touch-${position}`);
      directions.append(button);
    }

    this.attackButton = this.createButton('Attack', 'Attack nearby enemies', onAttack);
    this.attackButton.classList.add('touch-attack');
    this.element.append(directions, this.attackButton);
    document.body.append(this.element);
  }

  createButton(text, label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => {
      if (!this.element.hidden) {
        action();
      }
      button.blur();
    });
    return button;
  }

  update(playing, attackReady) {
    this.element.hidden = !playing;
    this.attackButton.disabled = !attackReady || !playing;
    this.attackButton.textContent = attackReady ? 'Attack' : 'Wait';
    this.attackButton.setAttribute(
      'aria-label',
      attackReady ? 'Attack nearby enemies' : 'Attack recharging',
    );
  }
}
