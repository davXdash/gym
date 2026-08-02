import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const plans = {
  A: {
    title: 'Training A',
    focus: 'Brust · Rückenbreite · seitliche Schulter',
    exercises: [
      ['Schrägbankdrückmaschine dual','3 Sätze · 6–10 Wdh. · 150–180 Sek.','Letzter Satz bis keine vollständige saubere Wiederholung mehr möglich ist.'],
      ['Latzugstation mit Oberschenkelpolster','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust leicht anheben, Ellbogen nach unten führen, nicht zurückschwingen.'],
      ['Brustpresse sitzend','3 Sätze · 8–12 Wdh. · 120 Sek.','Schulterblätter an der Lehne halten.'],
      ['Rudermaschine mit Brustpolster','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust bleibt am Polster, vollständig kontrolliert strecken.'],
      ['Seithebemaschine ohne Armpolster','4 Sätze · 12–20 Wdh. · 75–90 Sek.','Letzte zwei Sätze bis zum sauberen Muskelversagen.'],
      ['Butterfly reverse mit Griffen','3 Sätze · 12–18 Wdh. · 90 Sek.','Schultern unten lassen, nicht mit dem Kopf nach vorne gehen.'],
      ['Bauchmuskelmaschine','3 Sätze · 10–15 Wdh. · 90 Sek.','Brustkorb Richtung Becken einrollen.']
    ]
  },
  B: {
    title: 'Training B',
    focus: 'obere Brust · Rückendicke · hintere Schulter · Arme',
    exercises: [
      ['Kurzhantel-Schrägbankdrücken','3 Sätze · 6–10 Wdh. · 180 Sek.','Bank 20–30°. Nicht unter den Hanteln scheitern.'],
      ['High Row dual','3 Sätze · 8–12 Wdh. · 120 Sek.','Brust am Polster, Ellbogen nach hinten und leicht unten.'],
      ['Butterfly mit Griffen','3 Sätze · 10–15 Wdh. · 90 Sek.','Weit und kontrolliert öffnen, Schulter nicht nach vorne werfen.'],
      ['Low Row dual','3 Sätze · 8–12 Wdh. · 120 Sek.','Griff Richtung oberer Bauch, nicht zurückreißen.'],
      ['Seithebemaschine ohne Armpolster','4 Sätze · 12–20 Wdh. · 75–90 Sek.','Letzte zwei Sätze bis zum sauberen Muskelversagen.'],
      ['Butterfly reverse mit Griffen','3 Sätze · 12–18 Wdh. · 90 Sek.','Kontrolliert nach außen führen.'],
      ['Trizepsmaschine Überkopf','2 Sätze · 10–15 Wdh. · 90 Sek.','Letzter Satz bis zum sauberen Muskelversagen.'],
      ['Bizepsmaschine','2 Sätze · 10–15 Wdh. · 90 Sek.','Oberarme stabil halten.']
    ]
  }
};

const loading = document.querySelector('#loading');
const loginScreen = document.querySelector('#login-screen');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const workoutList = document.querySelector('#workout-list');
const dialog = document.querySelector('#workout-dialog');
const exerciseList = document.querySelector('#exercise-list');
const dialogTitle = document.querySelector('#dialog-title');

function showOnly(element) {
  [loading, loginScreen, dashboard].forEach(el => el.classList.add('hidden'));
  element.classList.remove('hidden');
}

function renderPlans() {
  workoutList.innerHTML = Object.entries(plans).map(([code, plan]) => `
    <article class="workout-card">
      <p class="eyebrow">EINHEIT ${code}</p>
      <h3>${plan.title}</h3>
      <p class="muted">${plan.focus}</p>
      <div class="workout-meta"><span>${plan.exercises.length} Übungen</span><span>fortlaufende Rotation</span></div>
      <button data-workout="${code}">Ansehen</button>
    </article>`).join('');
}

function openWorkout(code) {
  const plan = plans[code];
  dialogTitle.textContent = plan.title;
  exerciseList.innerHTML = plan.exercises.map(([name, prescription, notes]) => `
    <article class="exercise-card">
      <div class="exercise-image">Bildzuordnung folgt</div>
      <div class="exercise-body">
        <h3>${name}</h3>
        <p class="exercise-prescription">${prescription}</p>
        <p class="exercise-notes">${notes}</p>
      </div>
    </article>`).join('');
  dialog.showModal();
}

async function initialise() {
  renderPlans();
  const { data: { session } } = await supabase.auth.getSession();
  showOnly(session ? dashboard : loginScreen);
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.';
    return;
  }
  loginForm.reset();
  showOnly(dashboard);
});

document.querySelector('#logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  sessionStorage.clear();
  localStorage.removeItem('gym-current-workout');
  showOnly(loginScreen);
});

document.querySelector('#start-workout').addEventListener('click', () => openWorkout('A'));
workoutList.addEventListener('click', event => {
  const button = event.target.closest('[data-workout]');
  if (button) openWorkout(button.dataset.workout);
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());

supabase.auth.onAuthStateChange((_event, session) => {
  showOnly(session ? dashboard : loginScreen);
});

initialise().catch(() => {
  loginError.textContent = 'Die App konnte nicht vollständig geladen werden.';
  showOnly(loginScreen);
});
