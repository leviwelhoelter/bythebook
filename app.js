// ============================================
//   BY THE BOOK — app.js
//   Full PWA logic: AI chat, camera, calories,
//   workouts, skincare, calendar
// ============================================

// ===== STATE =====
const state = {
  currentPage: 'home',
  calories: { eaten: 0, goal: 2000, protein: 0, carbs: 0, fat: 0 },
  meals: [],
  streak: 0,
  chatHistory: [],
  workoutPlan: null,
  skinRoutine: null,
  profile: { name: '', age: '', calorieGoal: 2000 },
  selectedDay: new Date(),
  calendarOffset: 0,
  events: {},
  chipSelections: { goal: 'Build Muscle', equip: 'Full Gym', days: '4', skintype: 'Oily', budget: 'Budget Friendly' },
  skinConcerns: ['Acne'],
};

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    const seen = localStorage.getItem('btb_seen');
    if (seen) {
      showApp();
    } else {
      document.getElementById('onboarding').classList.remove('hidden');
    }
  }, 2600);
  updateGreeting();
  renderCalendar();
});

function loadFromStorage() {
  const saved = localStorage.getItem('btb_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
  }
}

function saveToStorage() {
  localStorage.setItem('btb_state', JSON.stringify(state));
}

// ===== ONBOARDING =====
let currentSlide = 0;

function nextSlide() {
  const slides = document.querySelectorAll('.onboard-slide');
  const dots = document.querySelectorAll('.dot');
  if (currentSlide < slides.length - 1) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide++;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
    if (currentSlide === slides.length - 1) {
      document.getElementById('onboard-next-btn').style.display = 'none';
    }
  }
}

function goSlide(index) {
  const slides = document.querySelectorAll('.onboard-slide');
  const dots = document.querySelectorAll('.dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  document.getElementById('onboard-next-btn').style.display = currentSlide === slides.length - 1 ? 'none' : 'block';
}

function startApp() {
  localStorage.setItem('btb_seen', '1');
  document.getElementById('onboarding').classList.add('hidden');
  showApp();
}

function showApp() {
  document.getElementById('app').classList.remove('hidden');
  updateHomeStats();
  renderCalendar();
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`page-${page}`).classList.add('active');
  const navBtn = document.getElementById(`nav-${page}`);
  if (navBtn) navBtn.classList.add('active');

  state.currentPage = page;

  if (page === 'home') updateHomeStats();
  if (page === 'calories') updateCalorieRing();
  if (page === 'calendar') renderCalendar();
}

// ===== GREETING =====
function updateGreeting() {
  const h = new Date().getHours();
  const greetings = ['Good night', 'Good morning', 'Good afternoon', 'Good evening'];
  const g = h < 5 ? 0 : h < 12 ? 1 : h < 17 ? 2 : 3;
  document.getElementById('greeting').textContent = greetings[g];

  const name = state.profile.name;
  document.getElementById('user-name').textContent = name ? `Hey, ${name} 👋` : '📖 By the Book';
}

// ===== HOME STATS =====
function updateHomeStats() {
  document.getElementById('home-cals').textContent = state.calories.eaten;
  document.getElementById('streak-count').textContent = state.streak;
  if (state.workoutPlan) {
    const today = new Date().toLocaleDateString('en', { weekday: 'long' });
    const todayPlan = state.workoutPlan.find(d => d.day === today);
    document.getElementById('home-workout').textContent = todayPlan ? todayPlan.focus : 'Rest';
  }
}

// ===== AI CHAT =====
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendChatMsg('user', msg);

  state.chatHistory.push({ role: 'user', content: msg });

  const typing = appendChatMsg('ai', '...');

  try {
    const response = await callClaude(state.chatHistory, getSystemPrompt());
    const reply = response.content[0].text;
    typing.querySelector('.msg-bubble').textContent = reply;
    state.chatHistory.push({ role: 'assistant', content: reply });

    // Parse AI actions
    handleAIActions(reply, msg);
  } catch (err) {
    typing.querySelector('.msg-bubble').textContent = 'Sorry, I had trouble connecting. Please try again!';
  }

  scrollChat();
  saveToStorage();
}

function handleAIActions(reply, userMsg) {
  const lower = reply.toLowerCase();
  // If user mentioned logging food/calories and AI responded with numbers
  if ((userMsg.toLowerCase().includes('ate') || userMsg.toLowerCase().includes('had') || userMsg.toLowerCase().includes('eat')) && lower.includes('cal')) {
    const calMatch = reply.match(/(\d+)\s*(?:calories|kcal|cal)/i);
    if (calMatch) {
      const cals = parseInt(calMatch[1]);
      addCalories(cals, userMsg, 0, 0, 0);
    }
  }
}

function appendChatMsg(role, text) {
  const window_ = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  window_.appendChild(div);
  scrollChat();
  return div;
}

function scrollChat() {
  const cw = document.getElementById('chat-window');
  cw.scrollTop = cw.scrollHeight;
}

function getSystemPrompt() {
  return `You are the AI coach inside "By the Book", a self-improvement app for teens and young adults (16-25). You are knowledgeable, encouraging, and direct. You help users with:
- Workout plans and exercise advice
- Meal planning and calorie counting
- Skincare routines and tips
- General self-improvement and motivation
- Scheduling and productivity

When users describe food they ate, estimate the calories and mention them clearly (e.g. "That's about 450 calories").
When users ask for workouts, give specific exercises with sets and reps.
When users ask about skincare, give practical, affordable advice.
Keep responses concise and mobile-friendly. Use occasional emojis. Be like a knowledgeable friend, not a robot.
The user's current calorie goal is ${state.calories.goal} kcal/day. They've eaten ${state.calories.eaten} kcal today.`;
}

// ===== CAMERA =====
function openCamera(type) {
  document.getElementById(`camera-input-${type}`).click();
}

async function handleCameraAI(event) {
  const file = event.target.files[0];
  if (!file) return;

  const base64 = await fileToBase64(file);
  const imgUrl = URL.createObjectURL(file);

  // Show image in chat
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg user';
  msgDiv.innerHTML = `<div class="msg-bubble"><img src="${imgUrl}" class="msg-img" /><span>What can you tell me about this?</span></div>`;
  document.getElementById('chat-window').appendChild(msgDiv);
  scrollChat();

  const typing = appendChatMsg('ai', '...');

  try {
    const messages = [
      ...state.chatHistory,
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
          { type: 'text', text: 'Analyze this image in the context of self-improvement. If it\'s food, estimate calories and macros. If it\'s a person, give workout or skincare advice. If it\'s something else, be helpful and relevant.' }
        ]
      }
    ];

    const response = await callClaude(messages, getSystemPrompt());
    const reply = response.content[0].text;
    typing.querySelector('.msg-bubble').textContent = reply;
    state.chatHistory.push({ role: 'assistant', content: reply });

    // Auto-log calories from food photo
    const calMatch = reply.match(/(\d+)\s*(?:calories|kcal|cal)/i);
    if (calMatch) {
      addCalories(parseInt(calMatch[1]), 'Photo meal', 0, 0, 0);
    }
  } catch (err) {
    typing.querySelector('.msg-bubble').textContent = 'Could not analyze the image. Please try again!';
  }

  scrollChat();
  event.target.value = '';
}

async function handleCameraFood(event) {
  const file = event.target.files[0];
  if (!file) return;

  const base64 = await fileToBase64(file);
  const imgUrl = URL.createObjectURL(file);

  document.getElementById('img-modal-title').textContent = '🍽️ Analyzing your meal...';
  document.getElementById('img-preview').src = imgUrl;
  document.getElementById('img-ai-result').innerHTML = '<div class="spinner"></div>';
  document.getElementById('image-result-modal').classList.remove('hidden');

  try {
    const messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
        { type: 'text', text: 'You are a nutrition expert. Analyze this meal photo and provide: 1) What food you see, 2) Estimated total calories, 3) Approximate macros (protein, carbs, fat in grams). Format as: FOOD: [name], CALORIES: [number], PROTEIN: [g], CARBS: [g], FAT: [g], then a brief description.' }
      ]
    }];

    const response = await callClaude(messages, 'You are a nutrition expert analyzing food photos. Be accurate and specific.');
    const reply = response.content[0].text;

    document.getElementById('img-ai-result').innerHTML = reply.replace(/\n/g, '<br>');
    document.getElementById('img-modal-title').textContent = '✅ Meal Logged!';

    // Parse and log nutrition
    const calMatch = reply.match(/CALORIES:\s*(\d+)/i);
    const proteinMatch = reply.match(/PROTEIN:\s*(\d+)/i);
    const carbsMatch = reply.match(/CARBS:\s*(\d+)/i);
    const fatMatch = reply.match(/FAT:\s*(\d+)/i);
    const foodMatch = reply.match(/FOOD:\s*([^\n,]+)/i);

    const cals = calMatch ? parseInt(calMatch[1]) : 0;
    const protein = proteinMatch ? parseInt(proteinMatch[1]) : 0;
    const carbs = carbsMatch ? parseInt(carbsMatch[1]) : 0;
    const fat = fatMatch ? parseInt(fatMatch[1]) : 0;
    const foodName = foodMatch ? foodMatch[1].trim() : 'Photo Meal';

    if (cals > 0) addCalories(cals, foodName, protein, carbs, fat);
  } catch (err) {
    document.getElementById('img-ai-result').textContent = 'Could not analyze. Please try again.';
  }

  event.target.value = '';
}

async function handleCameraSkin(event) {
  const file = event.target.files[0];
  if (!file) return;

  const base64 = await fileToBase64(file);
  const imgUrl = URL.createObjectURL(file);

  document.getElementById('img-modal-title').textContent = '✨ Analyzing your skin...';
  document.getElementById('img-preview').src = imgUrl;
  document.getElementById('img-ai-result').innerHTML = '<div class="spinner"></div>';
  document.getElementById('image-result-modal').classList.remove('hidden');

  try {
    const messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
        { type: 'text', text: 'You are a skincare expert. Analyze this selfie and provide: 1) Observations about visible skin concerns, 2) 3 specific product recommendations with price ranges, 3) 2 immediate tips they can apply today. Be encouraging and specific. This is for a self-improvement app for teens and young adults.' }
      ]
    }];

    const response = await callClaude(messages, 'You are a knowledgeable, encouraging skincare expert helping teens improve their skin. Give practical, affordable advice.');
    const reply = response.content[0].text;
    document.getElementById('img-ai-result').innerHTML = reply.replace(/\n/g, '<br>');
    document.getElementById('img-modal-title').textContent = '✨ Skin Analysis Complete';
  } catch (err) {
    document.getElementById('img-ai-result').textContent = 'Could not analyze. Please make sure your face is visible and well-lit.';
  }

  event.target.value = '';
}

function closeImageModal() {
  document.getElementById('image-result-modal').classList.add('hidden');
}

// ===== CALORIE TRACKING =====
function openTextLog() {
  document.getElementById('text-log-modal').classList.remove('hidden');
}

function closeTextLog() {
  document.getElementById('text-log-modal').classList.add('hidden');
  document.getElementById('meal-text-input').value = '';
}

async function logMealText() {
  const text = document.getElementById('meal-text-input').value.trim();
  if (!text) return;

  const btn = document.querySelector('#text-log-modal .btn-primary');
  btn.textContent = 'Analyzing...';
  btn.disabled = true;

  try {
    const messages = [{
      role: 'user',
      content: `Analyze this meal description and provide nutritional info: "${text}". Format exactly as: FOOD: [name], CALORIES: [number], PROTEIN: [g], CARBS: [g], FAT: [g]. Then a one-sentence description.`
    }];

    const response = await callClaude(messages, 'You are a precise nutrition calculator. Always respond with the exact format requested.');
    const reply = response.content[0].text;

    const calMatch = reply.match(/CALORIES:\s*(\d+)/i);
    const proteinMatch = reply.match(/PROTEIN:\s*(\d+)/i);
    const carbsMatch = reply.match(/CARBS:\s*(\d+)/i);
    const fatMatch = reply.match(/FAT:\s*(\d+)/i);
    const foodMatch = reply.match(/FOOD:\s*([^\n,]+)/i);

    const cals = calMatch ? parseInt(calMatch[1]) : 300;
    const protein = proteinMatch ? parseInt(proteinMatch[1]) : 0;
    const carbs = carbsMatch ? parseInt(carbsMatch[1]) : 0;
    const fat = fatMatch ? parseInt(fatMatch[1]) : 0;
    const foodName = foodMatch ? foodMatch[1].trim() : text;

    addCalories(cals, foodName, protein, carbs, fat);
    closeTextLog();
  } catch (err) {
    alert('Could not analyze the meal. Please try again.');
  }

  btn.textContent = 'Log Meal';
  btn.disabled = false;
}

function addCalories(cals, name, protein, carbs, fat) {
  state.calories.eaten += cals;
  state.calories.protein += protein;
  state.calories.carbs += carbs;
  state.calories.fat += fat;

  state.meals.push({ name, cals, protein, carbs, fat, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });

  updateCalorieUI();
  saveToStorage();
}

function updateCalorieUI() {
  document.getElementById('cals-eaten').textContent = state.calories.eaten;
  document.getElementById('cals-goal').textContent = state.calories.goal;
  document.getElementById('protein-g').textContent = state.calories.protein;
  document.getElementById('carbs-g').textContent = state.calories.carbs;
  document.getElementById('fat-g').textContent = state.calories.fat;

  updateCalorieRing();
  renderMealList();
  updateHomeStats();
}

function updateCalorieRing() {
  const pct = Math.min(state.calories.eaten / state.calories.goal, 1);
  const circumference = 251.2;
  const offset = circumference - (pct * circumference);
  const ring = document.getElementById('cal-ring-fill');
  if (ring) ring.style.strokeDashoffset = offset;

  document.getElementById('cals-eaten').textContent = state.calories.eaten;
  document.getElementById('cals-goal').textContent = state.calories.goal;
}

function renderMealList() {
  const list = document.getElementById('meal-list');
  if (state.meals.length === 0) {
    list.innerHTML = '<div class="empty-state">No meals logged yet. Snap or type your first meal!</div>';
    return;
  }

  list.innerHTML = state.meals.map(m => `
    <div class="meal-item">
      <div class="meal-item-left">
        <strong>${m.name}</strong>
        <span>${m.time} · P:${m.protein}g C:${m.carbs}g F:${m.fat}g</span>
      </div>
      <div class="meal-kcal">${m.cals} kcal</div>
    </div>
  `).join('');
}

// ===== WORKOUT =====
function selectChip(el, group) {
  const parent = el.closest('.chip-group');
  parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.chipSelections[group] = el.textContent;
}

function toggleChip(el) {
  el.classList.toggle('active');
  const active = el.closest('.chip-group').querySelectorAll('.chip.active');
  state.skinConcerns = Array.from(active).map(c => c.textContent);
}

async function generateWorkout() {
  const goal = state.chipSelections.goal || 'Build Muscle';
  const equip = state.chipSelections.equip || 'Full Gym';
  const days = state.chipSelections.days || '4';

  document.getElementById('workout-setup').classList.add('hidden');
  document.getElementById('workout-loading').classList.remove('hidden');

  try {
    const messages = [{
      role: 'user',
      content: `Create a ${days}-day weekly workout plan for someone who wants to "${goal}" with access to: ${equip}. 
      Format as JSON array like this:
      [{"day":"Monday","focus":"Chest & Triceps","exercises":[{"name":"Bench Press","sets":"4","reps":"8-10","notes":"Keep back flat"},{"name":"Incline DB Press","sets":"3","reps":"10-12","notes":"Full range of motion"}]},...]
      Include ${days} training days and rest days. Make it realistic and effective for a 16-25 year old. Return ONLY valid JSON.`
    }];

    const response = await callClaude(messages, 'You are an expert personal trainer. Return only valid JSON, no other text.');
    let reply = response.content[0].text.trim();

    // Extract JSON
    const jsonMatch = reply.match(/\[[\s\S]*\]/);
    if (jsonMatch) reply = jsonMatch[0];

    const plan = JSON.parse(reply);
    state.workoutPlan = plan;
    saveToStorage();

    document.getElementById('workout-loading').classList.add('hidden');
    document.getElementById('workout-plan').classList.remove('hidden');

    renderWorkoutPlan(plan, goal);
  } catch (err) {
    document.getElementById('workout-loading').classList.add('hidden');
    document.getElementById('workout-setup').classList.remove('hidden');
    alert('Could not generate plan. Please try again.');
  }
}

function renderWorkoutPlan(plan, title) {
  document.getElementById('plan-title').textContent = `${title} Plan`;
  const container = document.getElementById('workout-days');

  container.innerHTML = plan.map((day, i) => `
    <div class="workout-day">
      <div class="workout-day-header" onclick="toggleDay(${i})">
        <strong>${day.day}</strong>
        <span>${day.focus}</span>
      </div>
      <div class="workout-day-body" id="day-body-${i}">
        ${day.exercises ? day.exercises.map(ex => `
          <div class="exercise-item">
            <strong>${ex.name}</strong>
            <span>${ex.sets} sets × ${ex.reps} reps${ex.notes ? ' · ' + ex.notes : ''}</span>
          </div>
        `).join('') : '<div class="exercise-item"><strong>Rest Day</strong><span>Recovery & stretching</span></div>'}
      </div>
    </div>
  `).join('');
}

function toggleDay(i) {
  const body = document.getElementById(`day-body-${i}`);
  body.classList.toggle('open');
}

function resetWorkout() {
  state.workoutPlan = null;
  saveToStorage();
  document.getElementById('workout-plan').classList.add('hidden');
  document.getElementById('workout-setup').classList.remove('hidden');
}

// ===== SKINCARE =====
async function generateSkincare() {
  const skinType = state.chipSelections.skintype || 'Oily';
  const concerns = state.skinConcerns.join(', ') || 'Acne';
  const budget = state.chipSelections.budget || 'Budget Friendly';

  document.getElementById('skin-setup').classList.add('hidden');
  document.getElementById('skin-loading').classList.remove('hidden');

  try {
    const messages = [{
      role: 'user',
      content: `Create a personalized skincare routine for: Skin Type: ${skinType}, Concerns: ${concerns}, Budget: ${budget}.
      Format as JSON:
      {"morning":[{"step":1,"product":"Cleanser","name":"CeraVe Hydrating Cleanser","why":"Gentle formula for ${skinType} skin","price":"$15"},...],"evening":[...]}
      Include 4-5 steps for morning and 5-6 for evening. Use real affordable product names. Return ONLY valid JSON.`
    }];

    const response = await callClaude(messages, 'You are a professional esthetician. Return only valid JSON.');
    let reply = response.content[0].text.trim();

    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) reply = jsonMatch[0];

    const routine = JSON.parse(reply);
    state.skinRoutine = routine;
    saveToStorage();

    document.getElementById('skin-loading').classList.add('hidden');
    document.getElementById('skin-routine').classList.remove('hidden');

    renderRoutine(routine.morning, 'skin-am-steps');
    renderRoutine(routine.evening, 'skin-pm-steps');
  } catch (err) {
    document.getElementById('skin-loading').classList.add('hidden');
    document.getElementById('skin-setup').classList.remove('hidden');
    alert('Could not generate routine. Please try again.');
  }
}

function renderRoutine(steps, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = steps.map(step => `
    <div class="routine-step">
      <span class="step-num">${step.step}</span>
      <strong>${step.product}: ${step.name}</strong>
      <p>${step.why} · <em>${step.price || ''}</em></p>
    </div>
  `).join('');
}

function resetSkin() {
  state.skinRoutine = null;
  saveToStorage();
  document.getElementById('skin-routine').classList.add('hidden');
  document.getElementById('skin-setup').classList.remove('hidden');
}

// ===== CALENDAR =====
function renderCalendar() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (state.calendarOffset * 7));

  const label = startOfWeek.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  document.getElementById('cal-week-label').textContent = label;

  const container = document.getElementById('cal-days');
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  container.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);

    const isToday = d.toDateString() === today.toDateString();
    const isSelected = d.toDateString() === state.selectedDay.toDateString();

    const div = document.createElement('div');
    div.className = `cal-day${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`;
    div.innerHTML = `<span class="cal-day-name">${days[i]}</span><span class="cal-day-num">${d.getDate()}</span>`;
    div.onclick = () => selectDay(d, fullDays[i]);
    container.appendChild(div);
  }

  renderDayEvents();
}

function selectDay(date, dayName) {
  state.selectedDay = date;
  renderCalendar();
  document.getElementById('selected-day-label').textContent = date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
  renderDayEvents();
}

function renderDayEvents() {
  const key = state.selectedDay.toDateString();
  const events = state.events[key] || [];

  // Add workout if plan exists
  const allEvents = [...events];
  if (state.workoutPlan) {
    const dayName = state.selectedDay.toLocaleDateString('en', { weekday: 'long' });
    const workoutDay = state.workoutPlan.find(d => d.day === dayName);
    if (workoutDay && workoutDay.focus !== 'Rest Day') {
      allEvents.unshift({ title: `💪 ${workoutDay.focus}`, time: 'Workout Day' });
    }
  }

  const list = document.getElementById('day-event-list');
  if (allEvents.length === 0) {
    list.innerHTML = '<div class="empty-state">No events today. Ask your AI coach to schedule something!</div>';
    return;
  }

  list.innerHTML = allEvents.map(e => `
    <div class="event-item">
      <strong>${e.title}</strong>
      <span>${e.time || ''}</span>
    </div>
  `).join('');
}

function changeWeek(dir) {
  state.calendarOffset += dir;
  renderCalendar();
}

// ===== PROFILE =====
function openProfile() {
  document.getElementById('profile-name').value = state.profile.name || '';
  document.getElementById('profile-cals').value = state.profile.calorieGoal || 2000;
  document.getElementById('profile-age').value = state.profile.age || '';
  document.getElementById('profile-modal').classList.remove('hidden');
}

function closeProfile() {
  document.getElementById('profile-modal').classList.add('hidden');
}

function saveProfile() {
  state.profile.name = document.getElementById('profile-name').value;
  state.profile.calorieGoal = parseInt(document.getElementById('profile-cals').value) || 2000;
  state.profile.age = document.getElementById('profile-age').value;
  state.calories.goal = state.profile.calorieGoal;

  saveToStorage();
  updateGreeting();
  closeProfile();
}

// ===== API CALL =====
async function callClaude(messages, systemPrompt) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    })
  });

  if (!response.ok) throw new Error('API error');
  return response.json();
}

// ===== UTILS =====
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Handle Enter key in chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'chat-input') {
    sendChat();
  }
});

// Initialize calorie UI on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    updateCalorieUI();
    if (state.workoutPlan) {
      document.getElementById('workout-setup').classList.add('hidden');
      document.getElementById('workout-plan').classList.remove('hidden');
      renderWorkoutPlan(state.workoutPlan, state.chipSelections.goal || 'Your');
    }
    if (state.skinRoutine) {
      document.getElementById('skin-setup').classList.add('hidden');
      document.getElementById('skin-routine').classList.remove('hidden');
      renderRoutine(state.skinRoutine.morning, 'skin-am-steps');
      renderRoutine(state.skinRoutine.evening, 'skin-pm-steps');
    }
  }, 100);
});
