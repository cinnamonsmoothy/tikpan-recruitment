(function () {
  const root = document.querySelector('#job-detail');
  if (!root) return;

  const slug = new URLSearchParams(window.location.search).get('job') || '';
  const title = document.querySelector('#job-title');
  const sector = document.querySelector('#job-sector');
  const meta = document.querySelector('#job-meta');
  const content = document.querySelector('#job-content');
  const description = document.querySelector('#job-description');
  const facts = document.querySelector('#job-facts');
  const apply = document.querySelector('#job-apply');
  const unavailable = document.querySelector('#job-unavailable');
  let loading = false;

  function addTextElements(target, values, tagName) {
    target.innerHTML = '';
    values.filter(Boolean).forEach(function (value) {
      const element = document.createElement(tagName);
      element.textContent = value;
      target.appendChild(element);
    });
  }

  function applicationUrl(job) {
    if (job.email) {
      return 'mailto:' + job.email + '?subject=' + encodeURIComponent('Application: ' + job.title);
    }
    if (job.phone) return 'tel:' + job.phone.replace(/[^+\d]/g, '');
    return 'mailto:info@tikpanrecruitment.co.uk?subject=' + encodeURIComponent('Application: ' + job.title);
  }

  function render(job) {
    if (!job) {
      title.textContent = 'Vacancy unavailable';
      sector.textContent = 'Vacancy';
      meta.innerHTML = '';
      content.hidden = true;
      unavailable.hidden = false;
      root.setAttribute('aria-busy', 'false');
      return;
    }

    title.textContent = job.title;
    sector.textContent = job.sector || 'Vacancy';
    document.title = job.title + ' | Tikpan Recruitment Group';
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.content = job.summary || job.title + ' vacancy from Tikpan Recruitment Group.';
    addTextElements(meta, [job.location, job.employmentType, job.workplace, job.salaryDisplay], 'span');
    description.innerHTML = window.JobsMarkdown.render(job.details || '');

    facts.innerHTML = '';
    [
      ['Sector', job.sector],
      ['Location', job.location],
      ['Workplace', job.workplace],
      ['Job type', job.employmentType],
      ['Hours', job.hours],
      ['Salary', job.salaryDisplay],
      ['Posted', job.postedDate],
      ['Closing date', job.closingDate],
      ['Email', job.email],
      ['Phone', job.phone]
    ].filter(function (item) { return item[1]; }).forEach(function (item) {
      const fact = document.createElement('div');
      fact.className = 'job-fact';
      const label = document.createElement('small');
      const value = document.createElement('strong');
      label.textContent = item[0];
      value.textContent = item[1];
      fact.appendChild(label);
      fact.appendChild(value);
      facts.appendChild(fact);
    });

    apply.href = applicationUrl(job);
    unavailable.hidden = true;
    content.hidden = false;
    root.setAttribute('aria-busy', 'false');
  }

  function loadJob() {
    if (loading) return;
    loading = true;
    window.JobsBoardSource.load().then(function (data) {
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      render(jobs.find(function (job) { return job.slug === slug; }));
    }).catch(function () {
      render(null);
    }).finally(function () {
      loading = false;
    });
  }

  loadJob();
  window.setInterval(function () {
    if (!document.hidden) loadJob();
  }, window.JobsBoardSource.refreshMs());
})();
