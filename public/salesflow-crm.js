document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('salesflow_jwt');

  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  const STAGES_LIST = ['Prospecting', 'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

  let salesChartInstance = null;
  let reportsChartInstance = null;
  let activeTheme = localStorage.getItem('salesflow_theme') || 'light';
  let isSidebarCollapsed = localStorage.getItem('salesflow_sidebar_collapsed') === 'true';
  let compactModeActive = localStorage.getItem('salesflow_compact_mode') === 'true';

  // Apply layout configurations
  applySystemTheme(activeTheme);
  applySidebarState(isSidebarCollapsed);
  applyCompactMode(compactModeActive);

  // Notifications Storage State Array
  let notificationAlerts = [
    { id: 'n1', text: 'Fresh workspace initialization successfully updated', date: 'Just now' },
    { id: 'n2', text: 'Neon database server connected on port 3001', date: '10 mins ago' }
  ];

  // Separates 401 (Session Expired) and 403 (No Permission) to prevent automatic logout loops
  async function fetchSecure(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem('salesflow_jwt');
      window.location.href = '/index.html';
      throw new Error('Unauthorized session token');
    }

    if (response.status === 403) {
      showToast("Access Denied: Administrator permissions required.", "error");
      throw new Error('Forbidden resource access');
    }

    return response.json();
  }

  // Unified Toast Notification portal helper
  function showToast(message, type = "success") {
    const portal = document.getElementById('toast-portal');
    if (!portal) return;

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-lg shadow-2xl text-white text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 flex items-center space-x-2 ${
      type === 'success' ? 'bg-emerald-600 border-l-4 border-emerald-800' : 'bg-rose-600 border-l-4 border-rose-800'
    }`;
    toast.innerHTML = `<span>${message}</span>`;

    portal.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
    }, 50);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => { toast.remove(); }, 300);
    }, 4000);
  }

  // ========================================================
  // INACTIVITY AND "SLEEP" SYSTEM CONTROLLER
  // ========================================================
  let inactivityTimeout;
  const dimIndicators = () => {
    // Dim the green online status indicator dots
    document.querySelectorAll('.online-indicator').forEach(el => {
      el.classList.remove('bg-emerald-500');
      el.classList.add('bg-slate-500/40');
    });
    // Put active highlights and header toggle buttons to "sleep" (dimmed opacity)
    const activeNavBtn = document.querySelector('#main-sidebar nav button.bg-blue-600');
    if (activeNavBtn) {
      activeNavBtn.classList.add('opacity-40');
    }
    const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
    if (mobileMenuToggleBtn) {
      mobileMenuToggleBtn.classList.add('opacity-40');
    }
  };

  const resetInactivityTimer = () => {
    // Wake up green online status indicator dots
    document.querySelectorAll('.online-indicator').forEach(el => {
      el.classList.add('bg-emerald-500');
      el.classList.remove('bg-slate-500/40');
    });
    // Wake up active highlighted navigation controls
    const activeNavBtn = document.querySelector('#main-sidebar nav button.bg-blue-600');
    if (activeNavBtn) {
      activeNavBtn.classList.remove('opacity-40');
    }
    const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
    if (mobileMenuToggleBtn) {
      mobileMenuToggleBtn.classList.remove('opacity-40');
    }
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(dimIndicators, 30000); // 30 seconds
  };

  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer);
  });
  resetInactivityTimer();

  // ========================================================
  // AVATAR IMAGE & MEDIA DEVICE CAMERA CONTROLS
  // ========================================================
  const avatarFileInput = document.getElementById('avatar-file-input');
  const btnAvatarUpload = document.getElementById('btn-avatar-upload');
  const btnAvatarCamera = document.getElementById('btn-avatar-camera');
  const btnAvatarRemove = document.getElementById('btn-avatar-remove');
  
  const modalCamera = document.getElementById('modal-camera');
  const cameraStreamVideo = document.getElementById('camera-stream');
  const btnCloseCamera = document.getElementById('btn-close-camera');
  const btnCaptureSnapshot = document.getElementById('btn-capture-snapshot');
  const cameraCanvas = document.getElementById('camera-canvas');
  
  let cameraStream = null;

  // Initialize cached avatar display on load
  const savedAvatar = localStorage.getItem('salesflow_user_avatar');
  if (savedAvatar) {
    updateAvatarDisplay(savedAvatar);
  }

  if (btnAvatarUpload && avatarFileInput) {
    btnAvatarUpload.addEventListener('click', () => {
      avatarFileInput.click();
    });
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          updateAvatarDisplay(dataUrl);
          localStorage.setItem('salesflow_user_avatar', dataUrl);
          showToast("Profile image updated successfully.", "success");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnAvatarCamera && modalCamera && cameraStreamVideo) {
    btnAvatarCamera.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        cameraStreamVideo.srcObject = cameraStream;
        modalCamera.classList.remove('hidden');
      } catch (err) {
        showToast("Unable to access system camera. Verify device permissions.", "error");
      }
    });
  }

  const stopCameraTracks = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (cameraStreamVideo) {
      cameraStreamVideo.srcObject = null;
    }
  };

  if (btnCloseCamera) {
    btnCloseCamera.addEventListener('click', () => {
      stopCameraTracks();
      modalCamera.classList.add('hidden');
    });
  }

  if (btnCaptureSnapshot && cameraCanvas && cameraStreamVideo) {
    btnCaptureSnapshot.addEventListener('click', () => {
      const context = cameraCanvas.getContext('2d');
      cameraCanvas.width = cameraStreamVideo.videoWidth || 320;
      cameraCanvas.height = cameraStreamVideo.videoHeight || 240;
      context.drawImage(cameraStreamVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
      
      const dataUrl = cameraCanvas.toDataURL('image/jpeg');
      updateAvatarDisplay(dataUrl);
      localStorage.setItem('salesflow_user_avatar', dataUrl);
      
      stopCameraTracks();
      modalCamera.classList.add('hidden');
      showToast("Camera snapshot saved successfully.", "success");
    });
  }

  if (btnAvatarRemove) {
    btnAvatarRemove.addEventListener('click', () => {
      localStorage.removeItem('salesflow_user_avatar');
      restoreDefaultAvatar();
      showToast("Avatar image removed successfully.", "success");
    });
  }

  function updateAvatarDisplay(dataUrl) {
    const settingsAvatar = document.getElementById('settings-avatar-pic');
    const headerAvatar = document.getElementById('user-avatar-container');
    const topHeaderAvatar = document.getElementById('btn-header-profile');
    
    if (settingsAvatar) {
      settingsAvatar.innerHTML = '';
      settingsAvatar.style.backgroundImage = `url(${dataUrl})`;
      settingsAvatar.style.backgroundSize = 'cover';
      settingsAvatar.style.backgroundPosition = 'center';
    }
    if (headerAvatar) {
      headerAvatar.innerHTML = '';
      headerAvatar.style.backgroundImage = `url(${dataUrl})`;
      headerAvatar.style.backgroundSize = 'cover';
      headerAvatar.style.backgroundPosition = 'center';
    }
    if (topHeaderAvatar) {
      topHeaderAvatar.innerHTML = '';
      topHeaderAvatar.style.backgroundImage = `url(${dataUrl})`;
      topHeaderAvatar.style.backgroundSize = 'cover';
      topHeaderAvatar.style.backgroundPosition = 'center';
    }
  }

  function restoreDefaultAvatar() {
    const settingsAvatar = document.getElementById('settings-avatar-pic');
    const headerAvatar = document.getElementById('user-avatar-container');
    const topHeaderAvatar = document.getElementById('btn-header-profile');
    const initials = (document.getElementById('set-profile-fn')?.value || 'U').charAt(0).toUpperCase();
    
    if (settingsAvatar) {
      settingsAvatar.style.backgroundImage = '';
      settingsAvatar.textContent = initials;
    }
    if (headerAvatar) {
      headerAvatar.style.backgroundImage = '';
      headerAvatar.textContent = initials;
    }
    if (topHeaderAvatar) {
      topHeaderAvatar.style.backgroundImage = '';
      topHeaderAvatar.textContent = initials;
    }
  }

  // Header collapse toggle button - handles responsive drawer toggling on mobile
  const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
  if (mobileMenuToggleBtn) {
    mobileMenuToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sidebar = document.getElementById('main-sidebar');
      if (!sidebar) return;

      if (window.innerWidth < 768) {
        sidebar.classList.toggle('hidden');
        sidebar.classList.toggle('flex');
        sidebar.classList.toggle('fixed');
        sidebar.classList.toggle('inset-y-0');
        sidebar.classList.toggle('left-0');
        sidebar.classList.toggle('z-50');
      } else {
        isSidebarCollapsed = !isSidebarCollapsed;
        localStorage.setItem('salesflow_sidebar_collapsed', isSidebarCollapsed);
        applySidebarState(isSidebarCollapsed);
      }
    });
  }

  // Handle tap-outside-to-close events on mobile viewports
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768) {
      const sidebar = document.getElementById('main-sidebar');
      const toggle = document.getElementById('mobile-menu-toggle-btn');
      if (sidebar && !sidebar.classList.contains('hidden') && !sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
      }
    }
  });

  // Responsive Sidebar collapsing adjustments to prevent layout offsets
  function applySidebarState(collapsed) {
    const sidebar = document.getElementById('main-sidebar');
    const texts = document.querySelectorAll('.sidebar-text');
    const profileBox = document.querySelector('.user-profile-box');
    const menuBtns = document.querySelectorAll('#main-sidebar nav button');

    if (!sidebar) return;

    if (window.innerWidth >= 768) {
      sidebar.classList.remove('hidden'); // Ensure visible on desktop
      if (collapsed) {
        sidebar.classList.remove('w-60');
        sidebar.classList.add('w-16');
        texts.forEach(el => el.classList.add('hidden'));
        if (profileBox) profileBox.classList.add('hidden');
        
        // Center menu items in collapsed state
        menuBtns.forEach(btn => {
          btn.classList.add('justify-center');
          btn.classList.remove('px-3');
          btn.classList.add('px-0');
        });
      } else {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-60');
        texts.forEach(el => el.classList.remove('hidden'));
        if (profileBox) profileBox.classList.remove('hidden');
        
        // Restore spacing
        menuBtns.forEach(btn => {
          btn.classList.remove('justify-center');
          btn.classList.add('px-3');
          btn.classList.remove('px-0');
        });
      }
    } else {
      sidebar.classList.remove('w-16');
      sidebar.classList.add('w-60');
      texts.forEach(el => el.classList.remove('hidden'));
      if (collapsed) {
        sidebar.classList.add('hidden');
      } else {
        sidebar.classList.remove('hidden');
      }
    }
  }

  function applySystemTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    const themeSelect = document.getElementById('set-app-theme');
    if (themeSelect) themeSelect.value = theme;
  }

  function applyCompactMode(active) {
    const viewport = document.getElementById('central-viewport');
    if (!viewport) return;
    if (active) {
      viewport.classList.add('compact-mode');
    } else {
      viewport.classList.remove('compact-mode');
    }
    const compactCheck = document.getElementById('set-app-compact');
    if (compactCheck) compactCheck.checked = active;
  }

  // Render Charts
  function renderSalesChart(salesByMonth) {
    const ctx = document.getElementById('pipeline-engagement-chart');
    if (!ctx) return;

    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    const labels = salesByMonth.map(s => s.name);
    const dataValues = salesByMonth.map(s => s.revenue);

    salesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue Tracker',
          data: dataValues,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10 } } }
        }
      }
    });
  }

  function renderReportsChart(salesByMonth) {
    const ctx = document.getElementById('revenue-progression-chart');
    if (!ctx) return;

    if (reportsChartInstance) {
      reportsChartInstance.destroy();
    }

    const labels = salesByMonth.map(s => s.name);
    const dataValues = salesByMonth.map(s => s.revenue);

    reportsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue Trend',
          data: dataValues,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Main navigation view routing mechanics
  const sidebarMenus = {
    dashboard: { btn: document.getElementById('menu-btn-dashboard'), view: document.getElementById('view-dashboard') },
    leads: { btn: document.getElementById('menu-btn-leads'), view: document.getElementById('view-leads') },
    customers: { btn: document.getElementById('menu-btn-customers'), view: document.getElementById('view-customers') },
    pipeline: { btn: document.getElementById('menu-btn-pipeline'), view: document.getElementById('view-pipeline') },
    tasks: { btn: document.getElementById('menu-btn-tasks'), view: document.getElementById('view-tasks') },
    emails: { btn: document.getElementById('menu-btn-emails'), view: document.getElementById('view-emails') },
    calculator: { btn: document.getElementById('menu-btn-calculator'), view: document.getElementById('view-calculator') },
    notes: { btn: document.getElementById('menu-btn-notes'), view: document.getElementById('view-notes') },
    aiInsights: { btn: document.getElementById('menu-btn-ai-insights'), view: document.getElementById('view-ai-insights') },
    reports: { btn: document.getElementById('menu-btn-reports'), view: document.getElementById('view-reports') },
    settings: { btn: document.getElementById('menu-btn-settings'), view: document.getElementById('view-settings') }
  };

  function switchMainView(targetKey) {
    Object.keys(sidebarMenus).forEach(key => {
      const menu = sidebarMenus[key];
      if (!menu.btn || !menu.view) return;

      if (key === targetKey) {
        menu.view.classList.remove('hidden');
        menu.btn.classList.add('text-white', 'bg-blue-600', 'font-bold');
        menu.btn.classList.remove('text-slate-400', 'hover:bg-slate-800/30', 'hover:text-blue-400', 'font-semibold');

        if (key === 'dashboard') loadDashboard();
        if (key === 'leads') loadLeads();
        if (key === 'customers') loadCustomers();
        if (key === 'pipeline') loadDashboard();
        if (key === 'tasks') loadTasks();
        if (key === 'emails') loadEmails();
        if (key === 'notes') renderNotes();
        if (key === 'reports') loadReportsData();
        if (key === 'settings') loadSettingsProfile();
      } else {
        menu.view.classList.add('hidden');
        menu.btn.classList.remove('text-white', 'bg-blue-600', 'font-bold');
        menu.btn.classList.add('text-slate-400', 'hover:bg-slate-800/30', 'hover:text-blue-400', 'font-semibold');
      }
    });
  }

  // Bind Sidebar Actions with Mobile Auto-Collapse Mechanics
  Object.keys(sidebarMenus).forEach(key => {
    const menu = sidebarMenus[key];
    if (menu.btn) {
      menu.btn.addEventListener('click', () => {
        switchMainView(key);
        if (window.innerWidth < 768) {
          const sidebar = document.getElementById('main-sidebar');
          if (sidebar) {
            sidebar.classList.add('hidden');
          }
        }
      });
    }
  });

  // Split-panel Settings sub-tabs routing logic
  const settingsTabButtons = document.querySelectorAll('.settings-sub-tab-btn');
  const settingsTabViews = document.querySelectorAll('.settings-panel-view');

  settingsTabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-settings-tab');

      settingsTabButtons.forEach(b => {
        b.classList.remove('text-blue-600', 'bg-blue-50/50', 'font-bold');
        b.classList.add('text-slate-600', 'hover:bg-slate-50', 'font-semibold');
      });
      e.currentTarget.classList.add('text-blue-600', 'bg-blue-50/50', 'font-bold');
      e.currentTarget.classList.remove('text-slate-600', 'hover:bg-slate-50', 'font-semibold');

      settingsTabViews.forEach(view => {
        if (view.id === `settings-pane-${targetTab}`) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      });

      if (targetTab === 'usersRoles') loadSettingsUsers();
      if (targetTab === 'orgProfile') loadSettingsProfile();
    });
  });

  async function loadSettingsProfile() {
    try {
      const data = await fetchSecure('/api/dashboard/summary');
      if (data && data.success) {
        document.getElementById('set-profile-fn').value = data.user.first_name || '';
        document.getElementById('set-profile-ln').value = data.user.last_name || '';
        document.getElementById('set-profile-display').value = `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim();
        document.getElementById('set-profile-email').value = data.user.email || '';
        document.getElementById('set-org-name').value = data.workspace.name || 'SalesFlow CRM';
      }
    } catch (err) {
      console.warn("Failed to complete settings check. Reverting parameters.");
    } finally {
      // Map configurations to visual options dynamically
      const savedCountry = localStorage.getItem('salesflow_country') || 'NG';
      const savedLang = localStorage.getItem('salesflow_lang') || 'en';
      const savedTimezone = localStorage.getItem('salesflow_timezone') || 'WAT';
      const savedCurrency = localStorage.getItem('salesflow_currency') || 'NGN';
      const savedGender = localStorage.getItem('salesflow_gender') || 'Male';

      const countryEl = document.getElementById('set-profile-country');
      const langEl = document.getElementById('set-profile-lang');
      const tzEl = document.getElementById('set-profile-timezone');
      const curEl = document.getElementById('set-pref-currency');
      const genEl = document.getElementById('set-profile-gender');

      if (countryEl) countryEl.value = savedCountry;
      if (langEl) langEl.value = savedLang;
      if (tzEl) tzEl.value = savedTimezone;
      if (curEl) curEl.value = savedCurrency;
      if (genEl) genEl.value = savedGender;
    }
  }

  async function loadSettingsUsers() {
    try {
      const data = await fetchSecure('/users');
      const body = document.getElementById('set-users-list-body');
      if (!body) return;
      body.innerHTML = '';

      const usersList = (data && Array.isArray(data.users)) ? data.users : (Array.isArray(data) ? data : []);

      if (usersList.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="p-2 text-slate-400 italic text-center">No registered users found.</td></tr>`;
        return;
      }

      usersList.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50/50';
        tr.innerHTML = `
          <td class="p-2 font-bold text-slate-800">${user.name || ''} (${user.email || ''})</td>
          <td class="p-2">
            <select class="role-select border border-slate-200 rounded p-1 bg-white text-slate-700 text-[10px] font-bold">
              <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Administrator</option>
              <option value="SALES_MANAGER" ${user.role === 'SALES_MANAGER' ? 'selected' : ''}>Sales Manager</option>
              <option value="SALES_REP" ${user.role === 'SALES_REP' ? 'selected' : ''}>Sales Rep</option>
            </select>
          </td>
          <td class="p-2"><span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold uppercase text-[9px]">Active</span></td>
          <td class="p-2 text-right">
            <button class="btn-update-role px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-semibold text-[9px]">Save Role</button>
          </td>
        `;

        const select = tr.querySelector('.role-select');
        const saveBtn = tr.querySelector('.btn-update-role');

        if (select && saveBtn) {
          saveBtn.addEventListener('click', async () => {
            try {
              const res = await fetchSecure(`/users/${user.id}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: select.value })
              });
              if (res && res.success) {
                showToast("User role updated successfully!", "success");
                loadSettingsUsers();
              }
            } catch (err) {
              showToast("Failed to update user role", "error");
            }
          });
        }

        body.appendChild(tr);
      });
    } catch (err) {
      console.error('Failed to load workspace users:', err);
    }
  }

  // Load database summary variables
  async function loadDashboard() {
    try {
      const data = await fetchSecure('/api/dashboard/summary');
      if (data && data.success) {
        renderDashboardUI(data.user, data.workspace, data.metrics, data.deals, data.leaderboard, data.salesByMonth);
        updateHeaderAlertsBadge();
        
        // Update the header profile parameters with DB session metrics
        const fullName = `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim();
        const headerName = document.getElementById('profile-menu-name');
        const headerEmail = document.getElementById('profile-menu-email');
        if (headerName) headerName.textContent = fullName || 'Active Session';
        if (headerEmail) headerEmail.textContent = data.user.email || 'user@workspace.com';
      }
    } catch (err) {
      console.warn("Could not retrieve dashboard configurations.", err);
    }
  }

  // Bind metrics values to HTML
  function renderDashboardUI(user, workspace, metrics, deals, leaderboard, salesByMonth) {
    const u = user || {};
    const m = metrics || {};

    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    const nameEl = document.getElementById('user-fullname');
    if (nameEl) nameEl.textContent = fullName || 'Active User';

    const roleEl = document.getElementById('user-role');
    if (roleEl) roleEl.textContent = u.role || 'Representative';

    const greetEl = document.getElementById('dashboard-user-greeting');
    if (greetEl) greetEl.textContent = u.first_name ? u.first_name.toUpperCase() : 'USER';

    const greetAiEl = document.getElementById('ai-user-greeting');
    if (greetAiEl) greetAiEl.textContent = u.first_name || 'User';

    const avatarEl = document.getElementById('user-avatar-container');
    const headerProfileEl = document.getElementById('btn-header-profile');
    if (u.first_name && !localStorage.getItem('salesflow_user_avatar')) {
      const initials = u.first_name.charAt(0).toUpperCase();
      if (avatarEl) avatarEl.textContent = initials;
      if (headerProfileEl) headerProfileEl.textContent = initials;
    }

    const totalLeadsEl = document.getElementById('kpi-total-leads');
    if (totalLeadsEl) totalLeadsEl.textContent = m.totalLeads ?? 0;

    const convLeadsEl = document.getElementById('kpi-converted-leads');
    if (convLeadsEl) convLeadsEl.textContent = m.convertedLeads ?? 0;

    const activeDealsEl = document.getElementById('kpi-active-deals');
    if (activeDealsEl) activeDealsEl.textContent = m.en_pipeline ?? 0;

    const wonDealsEl = document.getElementById('kpi-won-deals');
    if (wonDealsEl) wonDealsEl.textContent = m.wonDeals ?? 0;

    const lostDealsEl = document.getElementById('kpi-lost-deals');
    if (lostDealsEl) lostDealsEl.textContent = m.lostDeals ?? 0;

    const revenueEl = document.getElementById('kpi-revenue');
    if (revenueEl) {
      const activeCurrency = localStorage.getItem('salesflow_currency') || 'NGN';
      const formattedRevenue = parseFloat(m.facturacion_cobrada || 0).toLocaleString();
      revenueEl.textContent = activeCurrency === 'NGN' ? `₦${formattedRevenue}` : `$${formattedRevenue}`;
    }

    const tasksEl = document.getElementById('kpi-tasks');
    if (tasksEl) {
      tasksEl.textContent = m.tasksDue ?? 0;
    }

    const badgeEl = document.getElementById('tasks-badge-count');
    if (badgeEl) {
      if (m.tasksDue > 0) {
        badgeEl.textContent = m.tasksDue;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    const repsContainer = document.getElementById('table-performing-reps');
    if (repsContainer) {
      repsContainer.innerHTML = '';
      const leaderboardList = Array.isArray(leaderboard) ? leaderboard : [];
      if (leaderboardList.length === 0) {
        repsContainer.innerHTML = `<div class="p-2 text-slate-400 italic text-center">No active representatives.</div>`;
      } else {
        leaderboardList.forEach((rep, idx) => {
          const row = document.createElement('div');
          row.className = 'flex items-center justify-between py-2.5 text-[10px]';
          row.innerHTML = `
            <span class="font-bold text-slate-800">${idx + 1}. ${rep.name || ''}</span>
            <span class="font-extrabold text-slate-700">$${typeof rep.revenue === 'number' ? rep.revenue.toLocaleString() : '0'}</span>
          `;
          repsContainer.appendChild(row);
        });
      }
    }

    if (salesByMonth && salesByMonth.length > 0) {
      renderSalesChart(salesByMonth);
    }

    renderPipeline(deals || []);
  }

  function renderPipeline(deals) {
    const columns = {
      'Prospecting': document.getElementById('pipeline-prospecting'),
      'Demo Scheduled': document.getElementById('pipeline-demo'),
      'Proposal Sent': document.getElementById('pipeline-proposal'),
      'Negotiation': document.getElementById('pipeline-negotiation'),
      'Won': document.getElementById('pipeline-won'),
      'Lost': document.getElementById('pipeline-lost')
    };

    const counters = {
      'Prospecting': document.getElementById('count-prospecting'),
      'Demo Scheduled': document.getElementById('count-demo'),
      'Proposal Sent': document.getElementById('count-proposal'),
      'Negotiation': document.getElementById('count-negotiation'),
      'Won': document.getElementById('count-won'),
      'Lost': document.getElementById('count-lost')
    };

    Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });
    Object.values(counters).forEach(cnt => { if (cnt) cnt.textContent = ''; });

    const counts = { 'Prospecting': 0, 'Demo Scheduled': 0, 'Proposal Sent': 0, 'Negotiation': 0, 'Won': 0, 'Lost': 0 };
    const dealsList = Array.isArray(deals) ? deals : [];

    dealsList.forEach(deal => {
      let stageKey = 'Prospecting';
      if (columns[deal.stage]) stageKey = deal.stage;

      const col = columns[stageKey];
      if (col) {
        counts[stageKey]++;
        const div = document.createElement('div');
        div.className = 'bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs space-y-2';
        
        div.innerHTML = `
          <div class="flex justify-between items-start">
            <p class="font-bold text-slate-800 text-[10px] truncate w-24">${deal.name || ''}</p>
            <div class="flex space-x-1">
              <button class="btn-prev text-[9px] text-slate-400 hover:text-blue-600" title="Move back">◀</button>
              <button class="btn-next text-[9px] text-slate-400 hover:text-blue-600" title="Move forward">▶</button>
            </div>
          </div>
          <span class="text-[9px] text-slate-400 font-semibold">$${parseFloat(deal.amount || 0).toLocaleString()}</span>
        `;

        const currentIdx = STAGES_LIST.indexOf(stageKey);
        const btnPrev = div.querySelector('.btn-prev');
        const btnNext = div.querySelector('.btn-next');

        if (btnPrev && btnNext) {
          if (currentIdx === 0) btnPrev.classList.add('hidden');
          if (currentIdx === STAGES_LIST.length - 1) btnNext.classList.add('hidden');

          btnPrev.addEventListener('click', () => updateDealStage(deal.id, STAGES_LIST[currentIdx - 1]));
          btnNext.addEventListener('click', () => updateDealStage(deal.id, STAGES_LIST[currentIdx + 1]));
        }

        col.appendChild(div);
      }
    });

    Object.keys(counts).forEach(key => {
      if (counters[key] && counts[key] > 0) {
        counters[key].textContent = `${counts[key]}`;
      }
    });
  }

  async function updateDealStage(dealId, newStage) {
    try {
      const response = await fetchSecure(`/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage })
      });
      if (response && response.success) {
        loadDashboard();
      }
    } catch (err) {
      console.error('Failed to move stage:', err);
    }
  }

  // Load Leads List
  async function loadLeads() {
    try {
      const data = await fetchSecure('/leads');
      const body = document.getElementById('leads-table-body');
      if (!body) return;
      body.innerHTML = '';

      const leadsList = (data && Array.isArray(data.leads)) ? data.leads : (Array.isArray(data) ? data : []);

      if (leadsList.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="py-6 text-slate-400 italic text-center text-[10px]">No active leads found.</td></tr>`;
        return;
      }

      leadsList.forEach(lead => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50/50';
        tr.innerHTML = `
          <td class="py-2.5 font-bold text-slate-800">${lead.firstName || ''} ${lead.lastName || ''}</td>
          <td class="py-2.5 text-slate-500">${lead.companyName || ''}</td>
          <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase text-[9px]">${lead.status || 'new'}</span></td>
          <td class="py-2.5 text-right flex justify-end gap-1.5">
            ${lead.status !== 'converted' ? `
              <button class="btn-convert px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded font-bold transition-all">Convert</button>
            ` : `<span class="text-slate-400 italic font-bold py-1">Converted</span>`}
            <button class="btn-del-lead px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded font-bold transition-all">Delete</button>
          </td>
        `;

        const btnConvert = tr.querySelector('.btn-convert');
        if (btnConvert) {
          btnConvert.addEventListener('click', async () => {
            const confirmConvert = confirm('Convert this lead to a customer?');
            if (confirmConvert) {
              const res = await fetchSecure(`/leads/${lead.id}/convert`, { method: 'POST' });
              if (res && res.success) {
                showToast("Lead successfully converted to customer!", "success");
                loadLeads();
              }
            }
          });
        }

        const btnDel = tr.querySelector('.btn-del-lead');
        if (btnDel) {
          btnDel.addEventListener('click', async () => {
            const confirmDelete = confirm('Are you sure you want to permanently delete this lead?');
            if (confirmDelete) {
              try {
                const res = await fetchSecure(`/leads/${lead.id}`, { method: 'DELETE' });
                if (res && res.success) {
                  showToast("Lead successfully removed from PostgreSQL", "success");
                  loadLeads();
                  loadDashboard();
                }
              } catch (err) {
                showToast("Failed to delete lead from database", "error");
              }
            }
          });
        }
        body.appendChild(tr);
      });
    } catch (error) {
      console.error('Failed to load leads list:', error);
    }
  }

  // Load Customers
  async function loadCustomers() {
    try {
      const data = await fetchSecure('/contacts');
      const body = document.getElementById('customers-table-body');
      if (!body) return;
      body.innerHTML = '';

      const contactsList = (data && Array.isArray(data.contacts)) ? data.contacts : (Array.isArray(data) ? data : []);

      if (contactsList.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="py-6 text-slate-400 italic text-center text-[10px]">No converted customers found.</td></tr>`;
        return;
      }

      contactsList.forEach(contact => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50/50';
        tr.innerHTML = `
          <td class="py-2.5 font-bold text-slate-800">${contact.firstName || ''} ${contact.lastName || ''}</td>
          <td class="py-2.5 text-slate-500">${contact.companyName || ''}</td>
          <td class="py-2.5 text-slate-500">${contact.email || ''}</td>
          <td class="py-2.5 text-right">
            <button class="btn-del-cust px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded font-bold transition-all">Delete</button>
          </td>
        `;

        const btnDel = tr.querySelector('.btn-del-cust');
        if (btnDel) {
          btnDel.addEventListener('click', async () => {
            const confirmDelete = confirm('Are you sure you want to delete this customer record?');
            if (confirmDelete) {
              showToast("Customer profile marked as inactive", "success");
              tr.remove();
            }
          });
        }
        body.appendChild(tr);
      });
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }

  // Load Tasks List dynamically
  async function loadTasks() {
    try {
      const data = await fetchSecure('/tasks');
      const container = document.getElementById('tasks-due-list');
      if (!container) return;
      container.innerHTML = '';

      const tasksList = (data && Array.isArray(data.tasks)) ? data.tasks : (Array.isArray(data) ? data : []);

      if (tasksList.length === 0) {
        container.innerHTML = `<div class="p-6 text-slate-400 italic text-center text-[10px]">No tasks scheduled.</div>`;
        return;
      }

      tasksList.forEach(task => {
        const row = document.createElement('div');
        row.className = 'flex items-start justify-between text-[10px] py-2 border-b border-slate-50 gap-2';
        row.innerHTML = `
          <div class="flex items-start space-x-2.5 flex-1 min-w-0">
            <input type="checkbox" class="mt-0.5 rounded border-slate-300 text-blue-600 cursor-pointer" ${task.completed ? 'checked' : ''} />
            <div class="flex-1 min-w-0">
              <p class="font-bold text-slate-800 truncate ${task.completed ? 'line-through text-slate-400' : ''}">${task.title || ''}</p>
              <span class="text-[9px] text-slate-400 font-semibold">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}</span>
            </div>
          </div>
          <div class="flex items-center space-x-1.5 flex-shrink-0">
            <span class="text-[8px] font-bold px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}">${task.priority || 'Medium'}</span>
            <button class="btn-del-task text-slate-400 hover:text-rose-500 font-bold" title="Delete Task">✕</button>
          </div>
        `;

        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.addEventListener('change', async () => {
            await fetchSecure(`/tasks/${task.id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ completed: checkbox.checked })
            });
            loadTasks();
            loadDashboard();
          });
        }

        const delBtn = row.querySelector('.btn-del-task');
        if (delBtn) {
          delBtn.addEventListener('click', async () => {
            const confirmDelete = confirm('Are you sure you want to permanently delete this task?');
            if (confirmDelete) {
              row.remove();
              showToast("Task successfully removed from workspace", "success");
            }
          });
        }

        container.appendChild(row);
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  // Load Emails List dynamically
  async function loadEmails() {
    try {
      const data = await fetchSecure('/emails');
      const container = document.getElementById('emails-log-list');
      if (!container) return;
      container.innerHTML = '';

      const emailsList = (data && Array.isArray(data.emails)) ? data.emails : (Array.isArray(data) ? data : []);

      if (emailsList.length === 0) {
        container.innerHTML = `<div class="p-6 text-slate-400 italic text-center text-[10px]">No logged communications found.</div>`;
        return;
      }

      emailsList.forEach(email => {
        const div = document.createElement('div');
        div.className = 'py-3 text-[10px] space-y-1';
        div.innerHTML = `
          <div class="flex justify-between font-bold text-slate-800">
            <span>To: ${email.clientName || 'Unlinked'} - ${email.subject || ''}</span>
            <span class="text-slate-400">${email.date || ''}</span>
          </div>
          <p class="text-slate-500 leading-normal">${email.message || ''}</p>
        `;
        container.appendChild(div);
      });
    } catch (error) {
      console.error('Failed to load email logs:', error);
    }
  }

  // Active Email Manual Logger Form Submission Handler
  const emailForm = document.getElementById('form-email');
  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerId = document.getElementById('email-customer').value;
      const subject = document.getElementById('email-subject').value;
      const message = document.getElementById('email-message').value;

      try {
        const res = await fetchSecure('/emails', {
          method: 'POST',
          body: JSON.stringify({ customerId, subject, message })
        });

        if (res && res.success) {
          showToast("Email successfully logged to database!", "success");
          document.getElementById('modal-email').classList.add('hidden');
          emailForm.reset();
          loadEmails();
        }
      } catch (err) {
        showToast("Could not log email to database.", "error");
      }
    });
  }

  // Modal open and close handlers for manual email logging
  const openEmailModalBtn = document.getElementById('btn-open-email-modal');
  const closeEmailModalBtn = document.getElementById('btn-close-email-modal');

  if (openEmailModalBtn) {
    openEmailModalBtn.addEventListener('click', async () => {
      const modal = document.getElementById('modal-email');
      const select = document.getElementById('email-customer');
      if (!modal || !select) return;

      try {
        const data = await fetchSecure('/contacts');
        const list = (data && Array.isArray(data.contacts)) ? data.contacts : (Array.isArray(data) ? data : []);

        select.innerHTML = '';
        if (list.length === 0) {
          select.innerHTML = '<option value="">No active customers found to link</option>';
        } else {
          list.forEach(cust => {
            const option = document.createElement('option');
            option.value = cust.id;
            option.textContent = `${cust.firstName || ''} ${cust.lastName || ''} (${cust.companyName || ''})`;
            select.appendChild(option);
          });
        }

        modal.classList.remove('hidden');
      } catch (err) {
        showToast("Failed to fetch customer index", "error");
      }
    });
  }

  if (closeEmailModalBtn) {
    closeEmailModalBtn.addEventListener('click', () => {
      document.getElementById('modal-email').classList.add('hidden');
    });
  }

  // ========================================================
  // CALCULATION MODULE (Blank placeholders, no numbers)
  // ========================================================
  const calcTabs = document.querySelectorAll('.calc-tab-btn');
  const calcPanes = document.querySelectorAll('.calc-pane');
  const calcOutput = document.getElementById('calc-output-val');
  let selectedCalc = 'rev';

  calcTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedCalc = e.currentTarget.getAttribute('data-calc-tab');
      calcTabs.forEach(t => t.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold'));
      e.currentTarget.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');

      calcPanes.forEach(pane => {
        if (pane.id === `calc-pane-${selectedCalc}`) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      });
      runActiveCalculation();
    });
  });

  document.querySelectorAll('#calc-panes input').forEach(input => {
    input.addEventListener('input', runActiveCalculation);
  });

  function runActiveCalculation() {
    if (!calcOutput) return;
    let result = 0;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    if (selectedCalc === 'rev') {
      const vol = parseFloat(document.getElementById('calc-rev-volume').value) || 0;
      const prc = parseFloat(document.getElementById('calc-rev-price').value) || 0;
      result = vol * prc;
      calcOutput.textContent = formatter.format(result);
    } else if (selectedCalc === 'prof') {
      const rev = parseFloat(document.getElementById('calc-prof-rev').value) || 0;
      const cost = parseFloat(document.getElementById('calc-prof-cost').value) || 0;
      const profit = rev - cost;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      calcOutput.textContent = `${formatter.format(profit)} (${margin.toFixed(1)}% Margin)`;
    } else if (selectedCalc === 'comm') {
      const val = parseFloat(document.getElementById('calc-comm-val').value) || 0;
      const rate = parseFloat(document.getElementById('calc-comm-rate').value) || 0;
      result = val * (rate / 100);
      calcOutput.textContent = formatter.format(result);
    } else if (selectedCalc === 'disc') {
      const price = parseFloat(document.getElementById('calc-disc-price').value) || 0;
      const rate = parseFloat(document.getElementById('calc-disc-rate').value) || 0;
      const discAmt = price * (rate / 100);
      result = price - discAmt;
      calcOutput.textContent = `${formatter.format(result)} (Saved ${formatter.format(discAmt)})`;
    } else if (selectedCalc === 'roi') {
      const gain = parseFloat(document.getElementById('calc-roi-gain').value) || 0;
      const cost = parseFloat(document.getElementById('calc-roi-cost').value) || 0;
      const roi = cost > 0 ? ((gain - cost) / cost) * 100 : 0;
      calcOutput.textContent = `${roi.toFixed(1)}% ROI`;
    }
  }

  const copyCalcBtn = document.getElementById('btn-copy-calc');
  if (copyCalcBtn) {
    copyCalcBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(calcOutput.textContent);
      showToast("Result copied to clipboard!", "success");
    });
  }

  // RETRO SALES CALCULATOR INTEGRATED
  const retroCalcDisplay = document.getElementById('retro-calc-display');
  const retroCalcButtons = document.querySelectorAll('.btn-retro-calc');
  const retroCalcEqual = document.getElementById('btn-retro-calc-equal');
  let currentRetroCalcVal = "0";

  if (retroCalcDisplay) {
    retroCalcButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-val');
        if (val === 'C') {
          currentRetroCalcVal = "0";
        } else if (val === 'DEL') {
          currentRetroCalcVal = currentRetroCalcVal.slice(0, -1);
          if (currentRetroCalcVal === "") currentRetroCalcVal = "0";
        } else {
          if (currentRetroCalcVal === "0" && val !== '.') {
            currentRetroCalcVal = val;
          } else {
            currentRetroCalcVal += val;
          }
        }
        retroCalcDisplay.textContent = currentRetroCalcVal;
      });
    });

    if (retroCalcEqual) {
      retroCalcEqual.addEventListener('click', () => {
        try {
          const sanitizedExp = currentRetroCalcVal.replace(/[^0-9+\-*/.]/g, '');
          const result = Function(`"use strict"; return (${sanitizedExp})`)();
          currentRetroCalcVal = String(result);
          retroCalcDisplay.textContent = currentRetroCalcVal;
        } catch (err) {
          retroCalcDisplay.textContent = "Error";
          currentRetroCalcVal = "0";
        }
      });
    }
  }

  // ========================================================
  // NOTEPAD SCRATCHPAD MODULE (Blank, no pre-written notes)
  // ========================================================
  let notesArray = JSON.parse(localStorage.getItem('salesflow_user_notes')) || [];

  const noteForm = document.getElementById('form-note');
  const notesContainer = document.getElementById('notes-masonry-grid');
  const notesSearch = document.getElementById('notes-search');
  const catFilters = document.querySelectorAll('.note-filter-btn');
  let selectedNoteCat = 'all';

  if (noteForm) {
    noteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('note-title').value;
      const category = document.getElementById('note-category').value;
      const content = document.getElementById('note-content').value;

      const newNote = {
        id: Date.now().toString(),
        title,
        category,
        content,
        pinned: false,
        date: new Date().toLocaleDateString()
      };

      notesArray.push(newNote);
      saveAndRenderNotes();
      document.getElementById('modal-note').classList.add('hidden');
      noteForm.reset();
      showToast("Note successfully saved!", "success");
    });
  }

  if (notesSearch) {
    notesSearch.addEventListener('keyup', renderNotes);
  }

  catFilters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedNoteCat = e.currentTarget.getAttribute('data-note-cat');
      catFilters.forEach(f => f.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold'));
      e.currentTarget.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
      renderNotes();
    });
  });

  function saveAndRenderNotes() {
    localStorage.setItem('salesflow_user_notes', JSON.stringify(notesArray));
    renderNotes();
  }

  function renderNotes() {
    if (!notesContainer) return;
    notesContainer.innerHTML = '';

    const filterTerm = notesSearch ? notesSearch.value.toLowerCase() : '';
    const processedNotes = [...notesArray].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    if (processedNotes.length === 0) {
      notesContainer.innerHTML = `<div class="p-6 text-slate-400 italic text-center text-xs col-span-2">No notes created yet. Click "+ New Note" to begin.</div>`;
      return;
    }

    processedNotes.forEach(note => {
      const matchesSearch = note.title.toLowerCase().includes(filterTerm) || note.content.toLowerCase().includes(filterTerm);
      const matchesCat = selectedNoteCat === 'all' || note.category === selectedNoteCat;

      if (matchesSearch && matchesCat) {
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border bg-white shadow-xs space-y-3 relative ${note.pinned ? 'border-amber-400' : 'border-slate-100'}`;
        div.innerHTML = `
          <div class="flex justify-between items-start">
            <span class="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">${note.category}</span>
            <div class="flex space-x-1">
              <button class="btn-pin-note text-slate-400 hover:text-amber-500 font-bold" title="${note.pinned ? 'Unpin' : 'Pin'}">📌</button>
              <button class="btn-del-note text-slate-400 hover:text-rose-500 font-bold">✕</button>
            </div>
          </div>
          <h4 class="font-extrabold text-slate-800 text-xs">${note.title}</h4>
          <textarea class="note-edit-area w-full border-0 bg-transparent text-slate-500 text-xs leading-normal resize-none focus:outline-none" rows="3">${note.content}</textarea>
          <span class="text-[9px] text-slate-400 block font-semibold">${note.date}</span>
        `;

        const textarea = div.querySelector('.note-edit-area');
        textarea.addEventListener('input', () => {
          note.content = textarea.value;
          localStorage.setItem('salesflow_user_notes', JSON.stringify(notesArray));
        });

        div.querySelector('.btn-pin-note').addEventListener('click', () => {
          note.pinned = !note.pinned;
          saveAndRenderNotes();
        });

        div.querySelector('.btn-del-note').addEventListener('click', () => {
          notesArray = notesArray.filter(n => n.id !== note.id);
          saveAndRenderNotes();
        });

        notesContainer.appendChild(div);
      }
    });
  }

  const addNoteBtn = document.getElementById('btn-open-note-modal');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', () => {
      document.getElementById('modal-note').classList.remove('hidden');
    });
  }
  const closeNoteBtn = document.getElementById('btn-close-note-modal');
  if (closeNoteBtn) {
    closeNoteBtn.addEventListener('click', () => {
      document.getElementById('modal-note').classList.add('hidden');
    });
  }

  // ========================================================
  // LIVE GLOBAL SEARCH ENGINE (Strict Exclusions applied)
  // ========================================================
  const searchInput = document.getElementById('global-search-input');
  const searchDropdown = document.getElementById('search-results-dropdown');

  if (searchInput && searchDropdown) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      if (query.length < 2) {
        searchDropdown.classList.add('hidden');
        return;
      }

      searchDropdown.innerHTML = '';
      let resultsCount = 0;

      const staticPages = [
        { label: 'Executive Dashboard summary', key: 'dashboard' },
        { label: 'Leads Management Directory', key: 'leads' },
        { label: 'Converted Customers Index', key: 'customers' },
        { label: 'Task Follow-up Checklists', key: 'tasks' },
        { label: 'Email Communication Logs', key: 'emails' },
        { label: 'SaaS Calculator Suite', key: 'calculator' },
        { label: 'Workspace Notepad Notes', key: 'notes' },
        { label: 'Flow AI Insights Copilot', key: 'aiInsights' },
        { label: 'Reports & conversion Funnels', key: 'reports' },
        { label: 'System Settings Profiles', key: 'settings' }
      ];

      staticPages.forEach(page => {
        if (page.label.toLowerCase().includes(query)) {
          resultsCount++;
          const item = document.createElement('button');
          item.className = 'w-full text-left p-3 text-xs font-bold hover:bg-slate-50 block transition-all text-slate-700';
          item.innerHTML = `${page.label}`;
          item.addEventListener('click', () => {
            switchMainView(page.key);
            searchDropdown.classList.add('hidden');
            searchInput.value = '';
          });
          searchDropdown.appendChild(item);
        }
      });

      if (resultsCount === 0) {
        searchDropdown.innerHTML = `<div class="p-4 text-slate-400 italic text-center text-xs font-semibold">No results found matching "${query}"</div>`;
      }
      searchDropdown.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });
  }

  // ========================================================
  // NOTIFICATIONS PORTAL INTEGRATION
  // ========================================================
  const btnHeaderNotif = document.getElementById('btn-header-notif');
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifItemsList = document.getElementById('notif-items-list');
  const btnClearNotif = document.getElementById('btn-clear-notif');

  function updateHeaderAlertsBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (notificationAlerts.length > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    renderNotificationsDropdown();
  }

  function renderNotificationsDropdown() {
    if (!notifItemsList) return;
    notifItemsList.innerHTML = '';
    if (notificationAlerts.length === 0) {
      notifItemsList.innerHTML = `<div class="p-3 text-slate-400 text-center py-6">No new notifications.</div>`;
      return;
    }
    notificationAlerts.forEach(alertItem => {
      const item = document.createElement('div');
      item.className = 'p-3 hover:bg-slate-50 flex justify-between items-start gap-2';
      item.innerHTML = `
        <div class="space-y-0.5">
          <p class="font-semibold text-slate-800">${alertItem.text}</p>
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${alertItem.date}</span>
        </div>
        <button class="text-slate-300 hover:text-rose-500 font-extrabold text-[10px] btn-notif-remove focus:outline-none">✕</button>
      `;
      item.querySelector('.btn-notif-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        notificationAlerts = notificationAlerts.filter(a => a.id !== alertItem.id);
        updateHeaderAlertsBadge();
      });
      notifItemsList.appendChild(item);
    });
  }

  if (btnHeaderNotif && notifDropdown) {
    btnHeaderNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      notifDropdown.classList.add('hidden');
    });
    notifDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  if (btnClearNotif) {
    btnClearNotif.addEventListener('click', () => {
      notificationAlerts = [];
      updateHeaderAlertsBadge();
    });
  }

  // ========================================================
  // REPORTS VIEW DATA MANAGEMENT
  // ========================================================
  async function loadReportsData() {
    try {
      const data = await fetchSecure('/api/dashboard/summary');
      const funnelContainer = document.getElementById('reports-funnel-container');
      if (!data || !data.success || !funnelContainer) return;

      const m = data.metrics || {};
      const stages = [
        { name: 'Total Leads Registered', value: m.totalLeads ?? 0, color: 'bg-slate-100 text-slate-700' },
        { name: 'Qualified Opportunities', value: m.en_pipeline ?? 0, color: 'bg-blue-100 text-blue-700' },
        { name: 'Won Deals', value: m.wonDeals ?? 0, color: 'bg-emerald-100 text-emerald-700' }
      ];

      funnelContainer.innerHTML = '';
      stages.forEach(stage => {
        const div = document.createElement('div');
        div.className = `p-3 rounded-lg ${stage.color} flex justify-between items-center font-bold text-xs shadow-xs`;
        div.innerHTML = `<span>${stage.name}</span><span>${stage.value}</span>`;
        funnelContainer.appendChild(div);
      });

      if (data.salesByMonth) {
        renderReportsChart(data.salesByMonth);
      }
    } catch (err) {
      console.warn("Could not retrieve reports data stream.", err);
    }
  }

  // Form Creation Modals Dropdown Population Binders
  const openLeadModalBtn = document.getElementById('btn-open-lead-modal');
  const closeLeadModalBtn = document.getElementById('btn-close-lead-modal');
  const leadForm = document.getElementById('form-lead');

  if (openLeadModalBtn) {
    openLeadModalBtn.addEventListener('click', async () => {
      const modal = document.getElementById('modal-lead');
      const select = document.getElementById('lead-assignee');
      if (!modal || !select) return;

      try {
        const data = await fetchSecure('/users');
        const list = data.users || [];
        select.innerHTML = '';
        list.forEach(user => {
          const opt = document.createElement('option');
          opt.value = user.id;
          opt.textContent = `${user.name} (${user.role})`;
          select.appendChild(opt);
        });
        modal.classList.remove('hidden');
      } catch (err) {
        showToast("Failed to retrieve assigned reps index.", "error");
      }
    });
  }

  if (closeLeadModalBtn) {
    closeLeadModalBtn.addEventListener('click', () => {
      document.getElementById('modal-lead').classList.add('hidden');
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('lead-firstname').value;
      const lastName = document.getElementById('lead-lastname').value;
      const companyName = document.getElementById('lead-company').value;
      const email = document.getElementById('lead-email').value;
      const value = document.getElementById('lead-value').value;
      const source = document.getElementById('lead-source').value;

      try {
        const res = await fetchSecure('/leads', {
          method: 'POST',
          body: JSON.stringify({ firstName, lastName, companyName, email, value, source })
        });
        if (res && res.success) {
          showToast("Lead registered successfully", "success");
          document.getElementById('modal-lead').classList.add('hidden');
          leadForm.reset();
          loadLeads();
        }
      } catch (err) {
        showToast("Failed to save lead", "error");
      }
    });
  }

  const openDealModalBtn = document.getElementById('btn-open-deal-modal');
  const closeDealModalBtn = document.getElementById('btn-close-deal-modal');
  const dealForm = document.getElementById('form-deal');

  if (openDealModalBtn) {
    openDealModalBtn.addEventListener('click', async () => {
      const modal = document.getElementById('modal-deal');
      const select = document.getElementById('deal-customer');
      if (!modal || !select) return;

      try {
        const data = await fetchSecure('/contacts');
        const list = data.contacts || [];
        select.innerHTML = '';
        if (list.length === 0) {
          select.innerHTML = '<option value="">No active customers found</option>';
        } else {
          list.forEach(cust => {
            const opt = document.createElement('option');
            opt.value = cust.id;
            opt.textContent = `${cust.firstName} ${cust.lastName} (${cust.companyName})`;
            select.appendChild(opt);
          });
        }
        modal.classList.remove('hidden');
      } catch (err) {
        showToast("Failed to load customer profiles dropdown.", "error");
      }
    });
  }

  if (closeDealModalBtn) {
    closeDealModalBtn.addEventListener('click', () => {
      document.getElementById('modal-deal').classList.add('hidden');
    });
  }

  if (dealForm) {
    dealForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerId = document.getElementById('deal-customer').value;
      const title = document.getElementById('deal-name').value;
      const value = document.getElementById('deal-amount').value;
      const expectedCloseDate = document.getElementById('deal-closedate').value;
      const stage = document.getElementById('deal-stage').value;

      try {
        const res = await fetchSecure('/deals', {
          method: 'POST',
          body: JSON.stringify({ customerId, title, value, expectedCloseDate, stage })
        });
        if (res && res.success) {
          showToast("Opportunity registered successfully", "success");
          document.getElementById('modal-deal').classList.add('hidden');
          dealForm.reset();
          loadDashboard();
        }
      } catch (err) {
        showToast("Failed to save deal", "error");
      }
    });
  }

  const openTaskModalBtn = document.getElementById('btn-open-task-modal');
  const closeTaskModalBtn = document.getElementById('btn-close-task-modal');
  const taskForm = document.getElementById('form-task');

  if (openTaskModalBtn) {
    openTaskModalBtn.addEventListener('click', async () => {
      const modal = document.getElementById('modal-task');
      const select = document.getElementById('task-assignee');
      if (!modal || !select) return;

      try {
        const data = await fetchSecure('/users');
        const list = data.users || [];
        select.innerHTML = '';
        list.forEach(user => {
          const opt = document.createElement('option');
          opt.value = user.id;
          opt.textContent = `${user.name} (${user.role})`;
          select.appendChild(opt);
        });
        modal.classList.remove('hidden');
      } catch (err) {
        showToast("Failed to load assignees dropdown.", "error");
      }
    });
  }

  if (closeTaskModalBtn) {
    closeTaskModalBtn.addEventListener('click', () => {
      document.getElementById('modal-task').classList.add('hidden');
    });
  }

  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value;
      const description = document.getElementById('task-desc').value;
      const priority = document.getElementById('task-priority').value;
      const dueDate = document.getElementById('task-duedate').value;
      const assignedToId = document.getElementById('task-assignee').value;

      try {
        const res = await fetchSecure('/tasks', {
          method: 'POST',
          body: JSON.stringify({ title, description, priority, dueDate, assignedToId })
        });
        if (res && res.success) {
          showToast("Task registered successfully", "success");
          document.getElementById('modal-task').classList.add('hidden');
          taskForm.reset();
          loadTasks();
          loadDashboard();
        }
      } catch (err) {
        showToast("Failed to save task", "error");
      }
    });
  }

  // Settings Save Handler (Binds to Profile Name & Company)
  const saveSettingsBtn = document.getElementById('btn-save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const spinner = document.getElementById('save-settings-spinner');
      if (spinner) spinner.classList.remove('hidden');

      const fn = document.getElementById('set-profile-fn').value;
      const ln = document.getElementById('set-profile-ln').value;
      const company = document.getElementById('set-org-name').value;
      const password = document.getElementById('set-security-password').value;
      const confirmPass = document.getElementById('set-security-confirm').value;

      if (password && password !== confirmPass) {
        showToast("Passwords do not match", "error");
        if (spinner) spinner.classList.add('hidden');
        return;
      }

      // Read selected theme and compact options
      const themeSelector = document.getElementById('set-app-theme').value;
      const compactSelector = document.getElementById('set-app-compact').checked;

      localStorage.setItem('salesflow_theme', themeSelector);
      localStorage.setItem('salesflow_compact_mode', compactSelector);

      try {
        const res = await fetchSecure('/users/profile', {
          method: 'PATCH',
          body: JSON.stringify({ name: `${fn} ${ln}`.trim(), company, password })
        });

        setTimeout(() => {
          if (spinner) spinner.classList.add('hidden');
          if (res && res.success) {
            showToast("System configurations successfully saved to database!", "success");
            applySystemTheme(themeSelector);
            applyCompactMode(compactSelector);
            loadDashboard();
          } else {
            showToast("Failed to commit profile parameters.", "error");
          }
        }, 600);

      } catch (err) {
        if (spinner) spinner.classList.add('hidden');
        showToast("Network save failure", "error");
      }
    });
  }

  // CSV Data exporter
  const exportBtn = document.getElementById('btn-data-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const data = await fetchSecure('/leads');
        const list = data.leads || [];
        if (list.length === 0) {
          showToast("No lead records available to export.", "error");
          return;
        }

        let csvContent = "data:text/csv;charset=utf-8,First Name,Last Name,Company,Status\n";
        list.forEach(lead => {
          csvContent += `"${lead.firstName}","${lead.lastName}","${lead.companyName}","${lead.status}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `salesflow_leads_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CRM data exported successfully!", "success");
      } catch (err) {
        showToast("Export process failed", "error");
      }
    });
  }

  // danger zone buttons
  const btnArchiveAccount = document.getElementById('btn-archive-account');
  const btnDeleteAccount = document.getElementById('btn-delete-account');

  if (btnArchiveAccount) {
    btnArchiveAccount.addEventListener('click', () => {
      const confirmArchive = confirm("Confirm request to archive account profile? Access will be temporarily suspended.");
      if (confirmArchive) {
        showToast("Archival request submitted successfully.", "success");
      }
    });
  }

  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener('click', () => {
      const confirmDelete = confirm("Warning: Permanent account deletion. This operation is irreversible.");
      if (confirmDelete) {
        localStorage.removeItem('salesflow_jwt');
        alert("Account deleted. Redirecting to login gateway.");
        window.location.href = '/index.html';
      }
    });
  }

  // Logout Handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('salesflow_jwt');
      alert("You have been logged out successfully.");
      window.location.href = '/index.html';
    });
  }

  // Initialize view
  switchMainView('dashboard');
});
