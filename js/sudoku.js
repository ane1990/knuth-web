/* global window, document */
(function () {
  const initialValues = (typeof window !== 'undefined' && window.__SUDOKU_INITIAL__) || {};

  function createBoard() {
    const container = document.getElementById('sudoku-container');
    if (!container) return;
    
    const table = document.createElement('table');
    table.id = 'sudoku-board';
    container.appendChild(table);
    
    const board = table;
    for (let i = 0; i < 9; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 9; j++) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.id = `cell-${i}-${j}`;
        input.maxLength = 1;
        const key = `${i},${j}`;
        if (Object.prototype.hasOwnProperty.call(initialValues, key)) {
          input.value = String(initialValues[key]);
          input.disabled = true;
        }
        cell.appendChild(input);
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  }

  function getGrid() {
    const grid = [];
    for (let i = 0; i < 9; i++) {
      const row = [];
      for (let j = 0; j < 9; j++) {
        const val = document.getElementById(`cell-${i}-${j}`).value;
        row.push(val && !isNaN(val) ? parseInt(val, 10) : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  function setGrid(grid, highlight = true) {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = document.getElementById(`cell-${i}-${j}`);
        if (!cell.disabled) {
          cell.value = grid[i][j] || '';
          if (highlight) {
            cell.style.color = 'blue';
          }
        }
      }
    }
  }

  function resetSudoku() {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = document.getElementById(`cell-${i}-${j}`);
        const key = `${i},${j}`;
        if (Object.prototype.hasOwnProperty.call(initialValues, key)) {
          cell.value = initialValues[key];
          cell.disabled = true;
          cell.style.color = 'black';
        } else {
          cell.value = '';
          cell.disabled = false;
          cell.style.color = 'black';
        }
      }
    }
  }

  function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  function solve(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function solveSudoku() {
    const grid = getGrid();
    const gridCopy = JSON.parse(JSON.stringify(grid));
    if (solve(gridCopy)) {
      setGrid(gridCopy);
    } else {
      // eslint-disable-next-line no-alert
      alert('❌ No solution found!');
    }
  }

  function initSudoku() {
    createBoard();
  }

  window.initSudoku = initSudoku;
  window.solveSudoku = solveSudoku;
  window.resetSudoku = resetSudoku;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSudoku);
  } else {
    initSudoku();
  }
})();


