(function () {
  const list = document.querySelector('#job-list');
  if (!list) return;
  const count = document.querySelector('#jobs-count');
  const empty = document.querySelector('#jobs-empty');
  const loadingState = document.querySelector('#jobs-loading');
  const search = document.querySelector('#job-search');
  const sector = document.querySelector('#job-sector');
  const location = document.querySelector('#job-location');
  const type = document.querySelector('#job-type');
  const pagination = document.querySelector('#jobs-pagination');
  const PAGE_SIZE = 20;
  let jobs = [];
  let loading = false;
  let currentPage = 1;

  const escapeHtml = function (value) {
    const node = document.createElement('div');
    node.textContent = value || '';
    return node.innerHTML;
  };
  const fillSelect = function (select, values) {
    const current = select.value;
    while (select.options.length > 1) select.remove(1);
    values.filter(Boolean).sort().forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (Array.from(select.options).some(function (option) { return option.value === current; })) {
      select.value = current;
    }
  };
  const pageNumbers = function (totalPages) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, function (_, index) { return index + 1; });
    }
    const pages = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('start-ellipsis');
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push('end-ellipsis');
    pages.push(totalPages);
    return pages;
  };
  const renderPagination = function (totalPages) {
    pagination.innerHTML = '';
    pagination.hidden = totalPages <= 1;
    if (totalPages <= 1) return;

    const addButton = function (label, page, options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'job-pagination-button' + (options.active ? ' is-active' : '');
      button.textContent = label;
      button.disabled = options.disabled;
      if (options.active) button.setAttribute('aria-current', 'page');
      button.setAttribute('aria-label', options.ariaLabel || label);
      button.addEventListener('click', function () {
        currentPage = page;
        render();
        document.querySelector('#jobs-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      pagination.appendChild(button);
    };

    addButton('Previous', currentPage - 1, {
      disabled: currentPage === 1,
      active: false,
      ariaLabel: 'Previous vacancy page'
    });
    pageNumbers(totalPages).forEach(function (page) {
      if (typeof page !== 'number') {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'job-pagination-ellipsis';
        ellipsis.textContent = '…';
        ellipsis.setAttribute('aria-hidden', 'true');
        pagination.appendChild(ellipsis);
        return;
      }
      addButton(String(page), page, {
        disabled: false,
        active: page === currentPage,
        ariaLabel: 'Vacancy page ' + page
      });
    });
    addButton('Next', currentPage + 1, {
      disabled: currentPage === totalPages,
      active: false,
      ariaLabel: 'Next vacancy page'
    });
  };
  const render = function () {
    const query = search.value.trim().toLowerCase();
    const visible = jobs.filter(function (job) {
      const haystack = [job.title, job.sector, job.location, job.workplace, job.employmentType, job.salaryDisplay]
        .join(' ')
        .toLowerCase();
      return (!query || haystack.includes(query)) &&
        (!sector.value || job.sector === sector.value) &&
        (!location.value || job.location === location.value) &&
        (!type.value || job.employmentType === type.value);
    });
    const totalPages = Math.ceil(visible.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, Math.max(totalPages, 1));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageJobs = visible.slice(pageStart, pageStart + PAGE_SIZE);
    list.innerHTML = pageJobs.map(function (job) {
      const metadata = [job.location, job.employmentType, job.workplace, job.salaryDisplay]
        .filter(Boolean)
        .map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; })
        .join('');
      return '<article class="job-card">' +
        '<div><span class="job-card-sector">' + escapeHtml(job.sector) + '</span>' +
        '<h3>' + escapeHtml(job.title) + '</h3>' +
        '<div class="job-meta">' + metadata + '</div></div>' +
        '<span class="job-card-action">View role <span aria-hidden="true">→</span></span>' +
        '<a class="job-card-link" href="' + encodeURI(job.detailUrl) + '" aria-label="View ' + escapeHtml(job.title) + '"></a>' +
        '</article>';
    }).join('');
    count.textContent = visible.length + (visible.length === 1 ? ' vacancy' : ' vacancies');
    empty.hidden = visible.length !== 0;
    list.hidden = visible.length === 0;
    renderPagination(totalPages);
  };

  const loadJobs = function () {
    if (loading) return;
    loading = true;
    const dataRequest = window.JobsBoardSource
      ? window.JobsBoardSource.load()
      : Promise.reject(new Error('The live jobs source did not load.'));

    dataRequest.then(function (data) {
      jobs = Array.isArray(data.jobs) ? data.jobs : [];
      fillSelect(sector, Array.from(new Set(jobs.map(function (job) { return job.sector; }))));
      fillSelect(location, Array.from(new Set(jobs.map(function (job) { return job.location; }))));
      fillSelect(type, Array.from(new Set(jobs.map(function (job) { return job.employmentType; }))));
      list.setAttribute('aria-busy', 'false');
      loadingState.hidden = true;
      render();
    })
    .catch(function () {
      jobs = [];
      list.setAttribute('aria-busy', 'false');
      loadingState.hidden = true;
      count.textContent = 'Vacancies unavailable';
      empty.hidden = false;
      list.hidden = true;
      pagination.hidden = true;
    }).finally(function () {
      loading = false;
    });
  };

  loadJobs();
  window.setInterval(function () {
    if (!document.hidden) loadJobs();
  }, window.JobsBoardSource ? window.JobsBoardSource.refreshMs() : 10000);

  [search, sector, location, type].forEach(function (control) {
    control.addEventListener(control === search ? 'input' : 'change', function () {
      currentPage = 1;
      render();
    });
  });
})();
