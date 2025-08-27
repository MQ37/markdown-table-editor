// Markdown Table Editor
class MarkdownTableEditor {
    constructor() {
        this.markdownInput = document.getElementById('markdownInput');
        this.editableTable = document.getElementById('editableTable');
        this.tableContainer = document.getElementById('tableContainer');

        // Selection state
        this.selectedRow = null;
        this.selectedColumn = null;
        this.isDragMode = false;

        // Keep stable references to header drag handlers per element
        // to avoid duplicate listeners and enable proper removal
        this.headerDragHandlers = new WeakMap();

        this.init();
    }

    init() {
        // Event listeners
        this.markdownInput.addEventListener('input', () => this.parseMarkdown());
        document.getElementById('createTable').addEventListener('click', () => this.createNewTable());
        document.getElementById('exportMarkdown').addEventListener('click', () => this.exportMarkdown());
        document.getElementById('addRow').addEventListener('click', () => this.addRow());
        document.getElementById('addColumn').addEventListener('click', () => this.addColumn());
        document.getElementById('deleteRow').addEventListener('click', () => this.deleteRow());
        document.getElementById('deleteColumn').addEventListener('click', () => this.deleteColumn());

        // Mode toggle
        document.getElementById('toggleMode').addEventListener('click', () => this.toggleMode());

        // Table cell editing
        this.editableTable.addEventListener('input', (e) => {
            if (e.target.tagName === 'TD' || e.target.tagName === 'TH') {
                this.updateMarkdown();
            }
        });

        // Initialize selection system
        this.initSelectionSystem();

        // Initialize drag and drop
        this.initDragAndDrop();

        // Set initial mode state
        this.editableTable.classList.add('selection-mode');

        // Update UI initially
        this.updateUI();
    }

    parseMarkdown() {
        const markdown = this.markdownInput.value;
        if (!markdown.trim()) {
            this.clearTable();
            return;
        }

        const table = this.markdownToTable(markdown);
        if (table) {
            this.renderTable(table);
            // Drag listeners are already attached in renderTable()
        }
    }

    markdownToTable(markdown) {
        const lines = markdown.trim().split('\n');
        if (lines.length < 2) return null;

        const rows = [];
        let isHeader = true;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || !line.includes('|')) continue;

            // Skip separator line (usually second line with dashes)
            if (i === 1 && line.match(/^\s*\|[\s\-\|:]+\|\s*$/)) {
                continue;
            }

            const cells = line.split('|').map(cell => cell.trim());
            // Remove empty cells at start/end if they exist
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();

            rows.push(cells);
        }

        return rows.length > 0 ? rows : null;
    }

    renderTable(rows) {
        // Clear existing content
        this.editableTable.innerHTML = '';

        // Create thead and tbody
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // First row becomes header
        if (rows.length > 0) {
            const headerRow = document.createElement('tr');

            rows[0].forEach((cell, cellIndex) => {
                const th = document.createElement('th');
                th.contentEditable = true;
                th.textContent = cell;
                th.setAttribute('data-col', cellIndex);
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
        }

        // Remaining rows go to tbody
        rows.slice(1).forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            row.forEach((cell, cellIndex) => {
                const td = document.createElement('td');
                td.contentEditable = true;
                td.textContent = cell;
                td.setAttribute('data-col', cellIndex);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        this.editableTable.appendChild(thead);
        this.editableTable.appendChild(tbody);

        // Apply current mode settings
        this.applyModeSettings();

        // Attach drag listeners to newly created headers
        this.attachDragListeners();
    }

    tableToMarkdown() {
        const thead = this.editableTable.querySelector('thead');
        const tbody = this.editableTable.querySelector('tbody');
        if (!thead && !tbody) return '';

        let markdown = '';

        // Process header row
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
                const cells = Array.from(headerRow.querySelectorAll('th'));
                if (cells.length > 0) {
                    const cellTexts = cells.map(cell => cell.textContent || '');
                    markdown += '| ' + cellTexts.join(' | ') + ' |\n';

                    // Add separator line after header
                    const separator = cells.map(() => '---').join(' | ');
                    markdown += '| ' + separator + ' |\n';
                }
            }
        }

        // Process body rows
        if (tbody) {
            const bodyRows = Array.from(tbody.querySelectorAll('tr'));
            bodyRows.forEach((row) => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length === 0) return;

                const cellTexts = cells.map(cell => cell.textContent || '');
                markdown += '| ' + cellTexts.join(' | ') + ' |\n';
            });
        }

        return markdown;
    }

    updateMarkdown() {
        const markdown = this.tableToMarkdown();
        this.markdownInput.value = markdown;
    }

    createNewTable() {
        const defaultTable = `| Header 1 | Header 2 | Header 3 |
| --- | --- | --- |
| Cell 1 | Cell 2 | Cell 3 |
| Cell 4 | Cell 5 | Cell 6 |`;

        this.markdownInput.value = defaultTable;
        this.parseMarkdown();
        this.clearSelections();
        this.applyModeSettings();
        // Drag listeners are already attached in renderTable()
    }

    exportMarkdown() {
        const markdown = this.tableToMarkdown();
        navigator.clipboard.writeText(markdown).then(() => {
            alert('Markdown copied to clipboard!');
        });
    }

    addRow() {
        const tbody = this.editableTable.querySelector('tbody');
        if (!tbody) return;

        const headerRow = this.editableTable.querySelector('thead tr');
        if (!headerRow) return;

        const colCount = headerRow.querySelectorAll('th').length;

        const newRow = document.createElement('tr');

        // Add cells
        for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.textContent = '';
            td.setAttribute('data-col', i);
            newRow.appendChild(td);
        }

        tbody.appendChild(newRow);
        this.applyModeSettings();
        this.updateMarkdown();
    }

    addColumn() {
        const thead = this.editableTable.querySelector('thead');
        const tbody = this.editableTable.querySelector('tbody');
        if (!thead || !tbody) return;

        const headerRow = thead.querySelector('tr');
        const bodyRows = Array.from(tbody.querySelectorAll('tr'));
        const colCount = headerRow.querySelectorAll('th').length;

        // Add to header
        const th = document.createElement('th');
        th.contentEditable = true;
        th.textContent = `Header ${colCount + 1}`;
        th.setAttribute('data-col', colCount);

        headerRow.appendChild(th);

        // Add to body rows
        bodyRows.forEach((row) => {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.textContent = '';
            td.setAttribute('data-col', colCount);
            row.appendChild(td);
        });

        this.applyModeSettings();
        this.attachDragListeners(); // Re-attach listeners to new headers
        this.updateMarkdown();
    }

    deleteRow() {
        const tbody = this.editableTable.querySelector('tbody');
        if (!tbody) return;

        if (this.selectedRow !== null && !this.isDragMode) {
            // Delete selected row
            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows[this.selectedRow - 1]) { // -1 because header is row 0
                rows[this.selectedRow - 1].remove();
                this.clearSelections();
                this.updateMarkdown();
            }
        } else {
            // Fallback to current behavior (delete last row)
            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows.length > 0) {
                rows[rows.length - 1].remove();
                this.updateMarkdown();
            }
        }
    }

    deleteColumn() {
        const thead = this.editableTable.querySelector('thead');
        const tbody = this.editableTable.querySelector('tbody');
        if (!thead || !tbody) return;

        const headerRow = thead.querySelector('tr');
        const bodyRows = Array.from(tbody.querySelectorAll('tr'));

        if (this.selectedColumn !== null && !this.isDragMode) {
            // Delete selected column
            const headerCells = Array.from(headerRow.querySelectorAll('th'));
            if (headerCells.length <= 1) return; // Keep at least one column

            if (headerCells[this.selectedColumn]) {
                headerCells[this.selectedColumn].remove();

                bodyRows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells[this.selectedColumn]) {
                        cells[this.selectedColumn].remove();
                    }
                });

                this.clearSelections();
                this.updateMarkdown();
            }
        } else {
            // Fallback to current behavior (delete last column)
            const headerCells = Array.from(headerRow.querySelectorAll('th'));
            if (headerCells.length <= 1) return;

            headerCells[headerCells.length - 1].remove();

            bodyRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length > 0) {
                    cells[cells.length - 1].remove();
                }
            });

            this.updateMarkdown();
        }
    }

    clearTable() {
        this.editableTable.innerHTML = '<thead></thead><tbody></tbody>';
    }

    applyModeSettings() {
        const allCells = this.editableTable.querySelectorAll('td, th');
        allCells.forEach(cell => {
            if (this.isDragMode) {
                cell.setAttribute('contenteditable', 'false');
                cell.style.cursor = 'default';
                cell.style.userSelect = 'none';
            } else {
                cell.setAttribute('contenteditable', 'true');
                cell.style.cursor = 'text';
                cell.style.userSelect = 'text';
            }
        });
    }

    initDragAndDrop() {
        // Initialize drag state
        this.draggedSrcColIndex = null;
        this.swapInProgress = false;

        // Don't attach listeners here - they'll be attached after table rendering
        console.log('Drag and drop initialized (listeners will be attached after table rendering)');
    }

    // Attach drag listeners to headers after they're created
    attachDragListeners() {
        const headers = this.editableTable.querySelectorAll('th');
        console.log('Attaching drag listeners to', headers.length, 'headers');

        headers.forEach((th) => {
            // If this header had listeners before, remove them using stored refs
            const existing = this.headerDragHandlers.get(th);
            if (existing) {
                th.removeEventListener('dragstart', existing.onDragStart);
                th.removeEventListener('dragend', existing.onDragEnd);
                th.removeEventListener('dragover', existing.onDragOver);
                th.removeEventListener('drop', existing.onDrop);
            }

            // Compute index dynamically at event time to be robust to structure changes
            const getIndex = () => Array.from(th.parentElement.children).indexOf(th);

            const onDragStart = (e) => this.handleDragStart(e, getIndex());
            const onDragEnd = (e) => this.handleDragEnd(e);
            const onDragOver = (e) => this.handleDragOver(e);
            const onDrop = (e) => this.handleDrop(e, getIndex());

            th.addEventListener('dragstart', onDragStart);
            th.addEventListener('dragend', onDragEnd);
            th.addEventListener('dragover', onDragOver);
            th.addEventListener('drop', onDrop);

            this.headerDragHandlers.set(th, { onDragStart, onDragEnd, onDragOver, onDrop });
        });
    }

    // Remove existing drag listeners to prevent duplicates
    removeDragListeners() {
        const headers = this.editableTable.querySelectorAll('th');
        headers.forEach((th) => {
            const existing = this.headerDragHandlers.get(th);
            if (existing) {
                th.removeEventListener('dragstart', existing.onDragStart);
                th.removeEventListener('dragend', existing.onDragEnd);
                th.removeEventListener('dragover', existing.onDragOver);
                th.removeEventListener('drop', existing.onDrop);
                this.headerDragHandlers.delete(th);
            }
        });
    }

    // Drag event handlers
    handleDragStart(e, index) {
        if (!this.isDragMode) {
            e.preventDefault();
            return;
        }

        // Check if the element is actually draggable
        if (e.target.getAttribute('draggable') !== 'true') {
            e.preventDefault();
            return;
        }

        this.draggedSrcColIndex = index;

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);

        // Visual feedback
        e.target.style.opacity = '0.4';
        e.target.style.transform = 'scale(0.95)';
    }

    handleDragEnd(e) {
        // Reset visual state
        e.target.style.opacity = '';
        e.target.style.transform = '';
        this.draggedSrcColIndex = null;
    }

    handleDragOver(e) {
        if (!this.isDragMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e, targetIndex) {
        if (!this.isDragMode) return;

        e.preventDefault();
        e.stopPropagation();

        // Guard against duplicate drop events during a single drag
        if (this.swapInProgress) {
            return;
        }

        if (this.draggedSrcColIndex === null || this.draggedSrcColIndex === undefined) {
            return;
        }

        if (targetIndex === this.draggedSrcColIndex) {
            return;
        }

        const sourceIndex = this.draggedSrcColIndex;

        this.swapInProgress = true;
        try {
            // Swap cells in all rows for the dragged and target columns
            const rows = this.editableTable.rows;
            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].cells;
                if (cells[sourceIndex] && cells[targetIndex]) {
                    const temp = cells[sourceIndex].innerHTML;
                    cells[sourceIndex].innerHTML = cells[targetIndex].innerHTML;
                    cells[targetIndex].innerHTML = temp;
                }
            }

            this.updateMarkdown();
        } catch (error) {
            console.error('Error during column swap:', error);
        } finally {
            // Reset drag state to avoid handling duplicate drops
            this.draggedSrcColIndex = null;
            this.swapInProgress = false;
        }
    }









    initSelectionSystem() {
        this.editableTable.addEventListener('click', (e) => {
            if (this.isDragMode) return;

            const target = e.target;

            // Row selection (click on any cell in body)
            if (target.tagName === 'TD') {
                const row = target.closest('tr');
                const tbody = this.editableTable.querySelector('tbody');
                const rowIndex = Array.from(tbody.children).indexOf(row) + 1; // +1 for header offset

                this.clearSelections();
                row.classList.add('selected-row');
                this.selectedRow = rowIndex;
                this.updateUI();
                return;
            }

            // Column selection (click on header cell)
            if (target.tagName === 'TH') {
                const cellIndex = Array.from(target.parentElement.children).indexOf(target);

                this.clearSelections();
                this.selectedColumn = cellIndex;

                // Highlight entire column
                const tbody = this.editableTable.querySelector('tbody');
                const bodyRows = Array.from(tbody.querySelectorAll('tr'));
                bodyRows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells[cellIndex]) {
                        cells[cellIndex].classList.add('selected-column');
                    }
                });
                target.classList.add('selected-column');
                this.updateUI();
                return;
            }

            // Clear selection when clicking elsewhere
            if (!target.closest('td') && !target.closest('th')) {
                this.clearSelections();
            }
        });
    }

    clearSelections() {
        this.selectedRow = null;
        this.selectedColumn = null;

        // Remove all selection classes
        const selectedElements = this.editableTable.querySelectorAll('.selected-row, .selected-column');
        selectedElements.forEach(element => {
            element.classList.remove('selected-row', 'selected-column');
        });

        this.updateUI();
    }

    toggleMode() {
        this.isDragMode = !this.isDragMode;
        this.clearSelections();

        // Manage draggable attributes and contenteditable based on mode
        const headers = this.editableTable.querySelectorAll('th');
        const bodyCells = this.editableTable.querySelectorAll('tbody td');

        if (this.isDragMode) {
            // Enable dragging on headers
            headers.forEach(th => {
                th.setAttribute('draggable', 'true');
                th.style.cursor = 'move';
            });

            // Disable contenteditable on all cells
            const allCells = this.editableTable.querySelectorAll('td, th');
            allCells.forEach(cell => {
                cell.setAttribute('contenteditable', 'false');
                cell.style.userSelect = 'none';
            });

            // Ensure drag listeners are attached
            this.attachDragListeners();
        } else {
            // Disable dragging on headers
            headers.forEach(th => {
                th.removeAttribute('draggable');
                th.style.cursor = 'default';
            });

            // Re-enable contenteditable on body cells
            bodyCells.forEach(cell => {
                cell.setAttribute('contenteditable', 'true');
                cell.style.userSelect = 'text';
            });
        }

        // Update CSS classes
        this.editableTable.classList.remove('selection-mode', 'drag-mode');
        if (this.isDragMode) {
            this.editableTable.classList.add('drag-mode');
        } else {
            this.editableTable.classList.add('selection-mode');
        }

        this.updateUI();
    }

    updateUI() {
        const modeButton = document.getElementById('toggleMode');
        const modeIndicator = document.getElementById('modeIndicator');
        const selectionStatus = document.getElementById('selectionStatus');
        const deleteRowBtn = document.getElementById('deleteRow');
        const deleteColBtn = document.getElementById('deleteColumn');

        if (this.isDragMode) {
            modeButton.textContent = 'Switch to Selection Mode';
            modeIndicator.textContent = 'Drag Mode';
            modeIndicator.className = 'mode-indicator drag';
            selectionStatus.textContent = '';
            deleteRowBtn.disabled = false;
            deleteColBtn.disabled = false;
        } else {
            modeButton.textContent = 'Switch to Drag Mode';
            modeIndicator.textContent = 'Selection Mode';
            modeIndicator.className = 'mode-indicator selection';

            if (this.selectedRow !== null) {
                selectionStatus.textContent = `Row ${this.selectedRow} selected`;
                deleteRowBtn.disabled = false;
                deleteColBtn.disabled = true;
            } else if (this.selectedColumn !== null) {
                selectionStatus.textContent = `Column ${this.selectedColumn + 1} selected`;
                deleteRowBtn.disabled = true;
                deleteColBtn.disabled = false;
            } else {
                selectionStatus.textContent = 'Click a cell to select row or column';
                deleteRowBtn.disabled = true;
                deleteColBtn.disabled = true;
            }
        }
    }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownTableEditor();
});