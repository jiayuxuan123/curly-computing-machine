(function () {
  'use strict';

  const STATE = {
    data: null,
    view: 'ai',
    timeFilter: '24h',
    categoryFilter: '',
    searchQuery: '',
    lastFetchTime: 0,
  };

  const CAT_COLORS = {
    '模型发布': '#6366f1',
    '开发者工具': '#06b6d4',
    '行业动态': '#f59e0b',
    '研究突破': '#10b981',
    '政策法规': '#ef4444',
    '产品更新': '#8b5cf6',
  };

  const CAT_CLASSES = {
    '模型发布': 'tag-model',
    '开发者工具': 'tag-tool',
    '行业动态': 'tag-industry',
    '研究突破': 'tag-research',
    '政策法规': 'tag-policy',
    '产品更新': 'tag-product',
  };

  const CAT_ICONS = {
    '模型发布': '🚀',
    '开发者工具': '🛠',
    '行业动态': '📊',
    '研究突破': '🔬',
    '政策法规': '⚖️',
    '产品更新': '🔄',
  };

  const AI_ICON = '🤖';

  function $ (sel) {
    return document.querySelector(sel);
  }

  function $$ (sel) {
    return document.querySelectorAll(sel);
  }

  function html (str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function timeAgo (dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return '刚刚 / just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚 / just now';
    if (mins < 60) return `${mins} 分钟前 / ${mins}min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小时前 / ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days} 天前 / ${days}d ago`;
  }

  function formatDate (dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  async function fetchData () {
    try {
      const resp = await fetch('data/data.json?t=' + Date.now());
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      STATE.data = await resp.json();
      STATE.lastFetchTime = Date.now();
      return true;
    } catch (e) {
      console.error('Fetch error:', e);
      return false;
    }
  }

  function getItems () {
    if (!STATE.data) return [];
    let items = STATE.view === 'ai' ? (STATE.data.aiOnly || []) : (STATE.data.all || []);

    if (STATE.timeFilter === '24h') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      items = items.filter(function (item) {
        return new Date(item.date).getTime() > cutoff;
      });
    }

    if (STATE.categoryFilter) {
      items = items.filter(function (item) {
        return item.tags && item.tags.indexOf(STATE.categoryFilter) !== -1;
      });
    }

    if (STATE.searchQuery) {
      var q = STATE.searchQuery.toLowerCase();
      items = items.filter(function (item) {
        return item.title.toLowerCase().indexOf(q) !== -1 ||
               (item.summary || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    return items;
  }

  function renderCard (item) {
    var sourceIcon = item.source.charAt(0).toUpperCase();
    var tagsHtml = '';
    var seen = {};

    if (item.tags) {
      tagsHtml = item.tags.map(function (tag) {
        if (seen[tag]) return '';
        seen[tag] = true;
        var cls = CAT_CLASSES[tag] || '';
        var icon = CAT_ICONS[tag] || '';
        return '<span class="tag ' + cls + '">' + icon + ' ' + html(tag) + '</span>';
      }).join('');
    }

    if (item.aiRelevant) {
      tagsHtml += '<span class="tag tag-ai">' + AI_ICON + ' AI</span>';
    }

    return (
      '<article class="news-card">' +
        '<div class="card-header">' +
          '<span class="source-badge">' + html(item.source) + '</span>' +
          '<span class="item-time" title="' + html(formatDate(item.date)) + '">' + timeAgo(item.date) + '</span>' +
        '</div>' +
        '<h3><a href="' + html(item.url) + '" target="_blank" rel="noopener noreferrer">' + html(item.title) + '</a></h3>' +
        '<p class="card-summary">' + html(item.summary).substring(0, 300) + '</p>' +
        '<div class="card-footer">' + tagsHtml + '</div>' +
      '</article>'
    );
  }

  function collectCategories (items) {
    var cats = {};
    items.forEach(function (item) {
      if (item.tags) {
        item.tags.forEach(function (tag) {
          cats[tag] = (cats[tag] || 0) + 1;
        });
      }
    });
    return cats;
  }

  function renderCategories (items) {
    var cats = collectCategories(items);
    var bar = $('#categoryBar');
    var htmlStr = '<button class="cat-chip' + (STATE.categoryFilter === '' ? ' active' : '') + '" data-category="">全部 All</button>';

    var ordered = ['模型发布', '开发者工具', '行业动态', '研究突破', '政策法规', '产品更新'];
    ordered.forEach(function (cat) {
      if (cats[cat]) {
        htmlStr += '<button class="cat-chip' + (STATE.categoryFilter === cat ? ' active' : '') + '" data-category="' + cat + '">' +
          (CAT_ICONS[cat] || '') + ' ' + cat + ' (' + cats[cat] + ')' +
        '</button>';
      }
    });

    bar.innerHTML = htmlStr;
  }

  function renderStats (items) {
    var bar = $('#statsBar');
    if (!STATE.data) {
      bar.innerHTML = '';
      return;
    }
    var total = STATE.view === 'ai' ? STATE.data.aiOnlyItems : STATE.data.totalItems;
    var shown = items.length;
    var pct = total > 0 ? Math.round(shown / total * 100) : 0;
    bar.textContent = '显示 ' + shown + ' 条 / ' + total + ' 条可用 (' + pct + '%)  |  Shown ' + shown + ' of ' + total;
  }

  function render () {
    if (!STATE.data) return;
    var items = getItems();
    var container = $('#newsContainer');

    if (items.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<div class="icon">📭</div>' +
          '<p>暂无匹配资讯 / No matching news</p>' +
          '<p style="font-size:0.85rem;margin-top:8px">试试切换视图或时间范围 / Try switching view or time range</p>' +
        '</div>';
    } else {
      container.innerHTML = items.map(renderCard).join('');
    }

    renderCategories(items);
    renderStats(items);
  }

  function updateLastUpdated () {
    var el = $('#lastUpdated');
    if (STATE.data && STATE.data.generated) {
      el.textContent = timeAgo(STATE.data.generated);
    } else {
      el.textContent = '加载中...';
    }
  }

  async function loadAndRender () {
    var ok = await fetchData();
    if (ok) {
      updateLastUpdated();
      render();
    } else {
      $('#newsContainer').innerHTML =
        '<div class="empty-state">' +
          '<div class="icon">⚠️</div>' +
          '<p>数据加载失败 / Failed to load data</p>' +
        '</div>';
    }
  }

  function setView (view) {
    STATE.view = view;
    $$('#viewTabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.view === view);
    });
    render();
  }

  function setTimeFilter (tf) {
    STATE.timeFilter = tf;
    $$('#timeFilter .tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.time === tf);
    });
    render();
  }

  function setCategory (cat) {
    STATE.categoryFilter = cat;
    render();
  }

  function setupEventListeners () {
    $('#viewTabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab && tab.dataset.view) setView(tab.dataset.view);
    });

    $('#timeFilter').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab && tab.dataset.time) setTimeFilter(tab.dataset.time);
    });

    $('#categoryBar').addEventListener('click', function (e) {
      var chip = e.target.closest('.cat-chip');
      if (chip && chip.dataset.category !== undefined) {
        setCategory(chip.dataset.category);
      }
    });

    var searchInput = $('#searchInput');
    var searchTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        STATE.searchQuery = searchInput.value.trim();
        render();
      }, 300);
    });

    $('#refreshBtn').addEventListener('click', function () {
      loadAndRender();
    });
  }

  function init () {
    setupEventListeners();
    loadAndRender();
    setInterval(loadAndRender, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
