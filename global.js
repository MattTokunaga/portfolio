console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

var navLinks = $$("nav a");




let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/MattTokunaga', title: 'GitHub'}
];

let nav = document.createElement('nav');

document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {

    let url = p.url;

    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }

    let title = p.title;

    //nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    if (a.host != location.host) {
        a.target = "_blank";
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option value="light dark">Automatic</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
          </select>
      </label>`
);


var select = document.querySelector('select');
select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
});


if ("colorScheme" in localStorage) {
    select.value = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
}

const form = document.querySelector('form');
form?.addEventListener('submit', function(event) {
    event.preventDefault();
    var data = new FormData(form);
    var url = form.action + "?"
    for (let [name, value] of data) {
        url = url + name + "=" + encodeURIComponent(value) + "&";
    }
    location.href = url.slice(0, -1);
});