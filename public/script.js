const menuToggle = document.querySelector('#menuToggle');
const mainNav = document.querySelector('#mainNav');
const contactForm = document.querySelector('#contactForm');
const formStatus = document.querySelector('#formStatus');
const submitButton = document.querySelector('#submitButton');

// Keep the footer year current.
document.querySelector('#year').textContent = new Date().getFullYear();

// Mobile navigation.
menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  });
});

// Submit the contact form to the Express API, which stores messages in SQLite.
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formStatus.textContent = 'Sending your message…';
  formStatus.className = 'form-status';
  submitButton.disabled = true;
  submitButton.innerHTML = 'Sending…';

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Something went wrong.');

    formStatus.textContent = result.message;
    formStatus.classList.add('success');
    contactForm.reset();
  } catch (error) {
    formStatus.textContent = error.message || 'Could not send your message. Please try again.';
    formStatus.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send message <span>↗</span>';
  }
});
