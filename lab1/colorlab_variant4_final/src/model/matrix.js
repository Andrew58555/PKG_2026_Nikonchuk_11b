/** Базовые операции над 3x3-матрицами. Никаких внешних библиотек. */

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, i) => sum + value * vector[i], 0));
}

export function multiplyMatrices(a, b) {
  return a.map((row, i) =>
    b[0].map((_, j) =>
      row.reduce((sum, value, k) => sum + value * b[k][j], 0),
    ),
  );
}

export function determinant3(m) {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export function inverse3(m) {
  const det = determinant3(m);
  if (Math.abs(det) < 1e-14) {
    throw new Error('Матрица вырождена и не может быть обращена.');
  }

  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];

  const cofactors = [
    [e * i - f * h, -(d * i - f * g), d * h - e * g],
    [-(b * i - c * h), a * i - c * g, -(a * h - b * g)],
    [b * f - c * e, -(a * f - c * d), a * e - b * d],
  ];

  const adjugate = [
    [cofactors[0][0], cofactors[1][0], cofactors[2][0]],
    [cofactors[0][1], cofactors[1][1], cofactors[2][1]],
    [cofactors[0][2], cofactors[1][2], cofactors[2][2]],
  ];

  return adjugate.map((row) => row.map((value) => value / det));
}

export function diagonal3([x, y, z]) {
  return [
    [x, 0, 0],
    [0, y, 0],
    [0, 0, z],
  ];
}
