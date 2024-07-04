import React, { useState } from 'react';
import './styles.css';

interface TableProps {
  rows: number;
}

const Table: React.FC<TableProps> = ({ rows }) => {
  const columns = 3;
  const [data, setData] = useState<string[][]>(
    Array(rows).fill('').map(() => Array(columns).fill(''))
  );
  // 수동으로 열 너비 설정
  const columnWidths = [40, 200, 400];
  // Header 이름 설정
  const headerNames = ['이름','직무 등급','원하는 연차 날짜'];
  // 수동으로 열 수정 가능 여부 설정
  const editableColumns = [true, true, true, false];


  const handleInputChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? value : cell))
    );
    setData(newData);
  };

  const handleHeaderCheckboxChange = (checked: boolean) => {
    const newData = data.map((row, rIdx) => {
      if (checked === true) {
        row[4] = 'checked'
      }
      else {
        row[4] = 'unchecked'
      }
      return row;
    });
    setData(newData);
  };

  const handleCheckboxChange = (rowIndex: number, checked: boolean) => {
    const newData = data.map((row, rIdx) => {
      if(rIdx === rowIndex){
        return checked ? ['checked', ...row.slice(1)] : ['unchecked', ...row.slice(1)];
      }
      return row;
    });
    setData(newData);
  };

  return (
    <div>
      <table className='table-style'>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
              />
            </th>
            {columnWidths.map((width, colIndex) => (
              <th key={colIndex} style={{ width: `${width}px` }}>
                {headerNames[colIndex]}
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