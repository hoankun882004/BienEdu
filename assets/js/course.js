import { topics } from "./data/topics.js";
import { initializeMotion } from "./motion.js";

const target = document.querySelector("[data-course-topics]");
if (target) {
  target.innerHTML = topics.map((topic) => `
    <article class="course-topic" data-reveal>
      <div class="course-topic__symbol" aria-hidden="true">${topic.symbol}</div>
      <div>
        <h3>${topic.title}</h3>
        <p>${topic.description}</p>
      </div>
      <span>${topic.focus}</span>
    </article>
  `).join("");
  initializeMotion();
}
