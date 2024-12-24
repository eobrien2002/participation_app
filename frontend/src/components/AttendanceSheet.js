import React, { useState } from "react";

const AttendanceSheet = () => {
  // Initial state with one row and one column
  const [grid, setGrid] = useState([[""]]);

  // Function to add a row
  const addRow = () => {
    const newRow = new Array(grid[0].length).fill("");
    setGrid([...grid, newRow]);
  };

  // Function to delete a row
  const deleteRow = () => {
    if (grid.length > 1) {
      setGrid(grid.slice(0, -1));
    }
  };

  // Function to add a column
  const addColumn = () => {
    const newGrid = grid.map((row) => [...row, ""]);
    setGrid(newGrid);
  };

  // Function to delete a column
  const deleteColumn = () => {
    if (grid[0].length > 1) {
      const newGrid = grid.map((row) => row.slice(0, -1));
      setGrid(newGrid);
    }
  };

  // Function to toggle a cell between selected and not selected
  const toggleCell = (rowIndex, colIndex) => {
    const newGrid = grid.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return row.map((cell, cIdx) => {
          if (cIdx === colIndex) {
            return cell === "" ? "selected" : "";
          }
          return cell;
        });
      }
      return row;
    });
    setGrid(newGrid);
  };

  return (
    <div>
      <button onClick={addRow}>Add Row</button>
      <button onClick={deleteRow}>Delete Row</button>
      <button onClick={addColumn}>Add Column</button>
      <button onClick={deleteColumn}>Delete Column</button>
      <table>
        <tbody>
          {grid.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: "50px",
                    height: "50px",
                    border: "1px solid black",
                    backgroundColor: cell === "selected" ? "darkgrey" : "white",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceSheet;
