import React, { useState } from 'react';
import './styles.css';

interface TableProps {
  rows: number;
}

const Table: React.FC<TableProps> = ({ rows }) => {
  const columns = 4;
  const [data, setData] = useState<string[][]>(
    Array(rows).fill('').map(() => Array(columns).fill(''))
  );
  // 수동으로 열 너비 설정
  const columnWidths = [20, 200, 100, 100];
  // 수동으로 열 수정 가능 여부 설정
  const editableColumns = [true, false, true, false];

  const handleInputChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? value : cell))
    );
    setData(newData);
  };

  const handleCheckboxChange = (rowIndex: number, checked: boolean) => {
    const newData = data.map((row, rIdx) =>
      rIdx === rowIndex ? ['checked', ...row.slice(1)] : row
    );
    setData(newData);
  };

  return (
    <div>
      <table>
        <thead>
          <tr>
            {columnWidths.map((width, colIndex) => (
              <th key={colIndex} style={{ width: `${width}px` }}>
                {colIndex + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td>
                <input
                  type="checkbox"
                  checked={row[0] === 'checked'}
                  onChange={(e) => handleCheckboxChange(rowIndex, e.target.checked)}
                />
              </td>
              {row.map((cell, colIndex) => (
                <td key={colIndex} style={{ width: `${columnWidths[colIndex]}px` }}>
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                    readOnly={!editableColumns[colIndex]}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;