const MAX = 15 * 60;
const CENTER = 5;
const GROWTH = 0.527;

const logistic = (x) => {
  return MAX / (1 + Math.exp(-GROWTH * (x - CENTER)));
}

for (let i = 0; i < 10; i++) {
  const min = Math.floor(logistic(i) / 60);
  const sec = Math.floor(logistic(i) % 60);
  console.log(`${String(i+1).padStart(2, ' ')}: ${String(min).padStart(2, ' ')}:${String(sec).padStart(2, '0')}`);
}


