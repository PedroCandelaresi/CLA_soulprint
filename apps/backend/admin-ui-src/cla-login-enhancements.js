(function () {
  var eyeOpenIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3.2"></circle></svg>';
  var eyeClosedIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.6a3.2 3.2 0 0 0 4.53 4.53"></path><path d="M9.9 5.2A11.3 11.3 0 0 1 12 5c6.2 0 10 7 10 7a18.3 18.3 0 0 1-3.3 3.9"></path><path d="M6.2 6.3C3.7 8 2 12 2 12s3.8 7 10 7a10.9 10.9 0 0 0 5.1-1.2"></path></svg>';

  function findPasswordInput() {
    var wrappedPasswordInput = document.querySelector('.cla-password-field input');

    if (wrappedPasswordInput instanceof HTMLInputElement) {
      return wrappedPasswordInput;
    }

    var selectors = [
      '#login_password',
      '.login-group input.password',
      'input.password',
      'input[autocomplete="current-password"]',
      'input[name="password"]',
      'input[type="password"]'
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var candidate = document.querySelector(selectors[index]);

      if (candidate instanceof HTMLInputElement) {
        return candidate;
      }
    }

    return null;
  }

  function updateToggleState(button, input) {
    var showingPassword = input.type === 'text';
    button.innerHTML = showingPassword ? eyeClosedIcon : eyeOpenIcon;
    button.setAttribute('aria-label', showingPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.setAttribute('aria-pressed', showingPassword ? 'true' : 'false');
  }

  function enhancePasswordField() {
    var passwordInput = findPasswordInput();

    if (!(passwordInput instanceof HTMLInputElement)) {
      return;
    }

    var wrapper = passwordInput.closest('.cla-password-field');

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'cla-password-field';
      passwordInput.parentNode.insertBefore(wrapper, passwordInput);
      wrapper.appendChild(passwordInput);
    }

    var toggleButton = wrapper.querySelector('.cla-password-toggle');

    if (!toggleButton) {
      toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'cla-password-toggle';
      toggleButton.addEventListener('click', function () {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        updateToggleState(toggleButton, passwordInput);
        passwordInput.focus({ preventScroll: true });
      });
      wrapper.appendChild(toggleButton);
    }

    updateToggleState(toggleButton, passwordInput);
  }

  function initLoginEnhancements() {
    enhancePasswordField();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginEnhancements, { once: true });
  } else {
    initLoginEnhancements();
  }

  var observer = new MutationObserver(function () {
    enhancePasswordField();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
