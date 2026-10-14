import { topics } from "./data/topics.js";

const list = document.querySelector("[data-topic-index]");

if (list) {
  list.innerHTML = topics.map((topic, index) => `
    <article class="topic-index__item ${index === 0 ? "is-active" : ""}" data-topic-item tabindex="0">
      <div class="topic-index__symbol" aria-hidden="true">${topic.symbol}</div>
      <div>
        <h3>${topic.title}</h3>
        <p>${topic.description}</p>
      </div>
      <span>${topic.focus}</span>
    </article>
  `).join("");

  list.addEventListener("pointerover", (event) => {
    const item = event.target.closest("[data-topic-item]");
    if (!item) return;
    list.querySelectorAll("[data-topic-item]").forEach((element) => element.classList.toggle("is-active", element === item));
  });

  list.addEventListener("focusin", (event) => {
    const item = event.target.closest("[data-topic-item]");
    if (!item) return;
    list.querySelectorAll("[data-topic-item]").forEach((element) => element.classList.toggle("is-active", element === item));
  });
}
