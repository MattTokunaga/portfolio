import { fetchJSON, renderProjects } from './global.js';
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');

console.log(projects);
console.log()

renderProjects(latestProjects, projectsContainer, 'h2');