export function normalizeVietnamese(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .trim();
}

export function filterCurriculum(groups, { query = "", groupId = "all" } = {}) {
  const normalizedQuery = normalizeVietnamese(query);
  return groups.flatMap((group) => {
    if (groupId !== "all" && group.id !== groupId) return [];
    return group.topics
      .filter((topic) => {
        if (!normalizedQuery) return true;
        const topicText = normalizeVietnamese(`${topic.id} ${topic.title} ${group.name}`);
        if (topicText.includes(normalizedQuery)) return true;
        return topic.exerciseTypes.some((exercise) =>
          normalizeVietnamese(`${exercise.id} ${exercise.code} ${exercise.title}`).includes(normalizedQuery)
        );
      })
      .map((topic) => ({ ...topic, groupName: group.name, groupOrder: group.order }));
  });
}

export function findTopic(groups, topicId) {
  for (const group of groups) {
    const topic = group.topics.find((item) => item.id === topicId);
    if (topic) return { ...topic, groupName: group.name };
  }
  return null;
}

export function findExerciseType(groups, topicId, exerciseIdOrCode) {
  const topic = findTopic(groups, topicId);
  if (!topic) return null;
  return topic.exerciseTypes.find((exercise) =>
    exercise.id === exerciseIdOrCode || exercise.code === exerciseIdOrCode
  ) ?? null;
}
