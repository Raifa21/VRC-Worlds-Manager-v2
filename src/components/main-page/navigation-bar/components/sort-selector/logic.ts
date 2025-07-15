export type SortField =
  | 'name'
  | 'authorName'
  | 'favorites'
  | 'dateAdded'
  | 'lastUpdated';

export type SortDirection = 'asc' | 'desc';

const getDefaultDirection = (field: SortField): 'asc' | 'desc' => {
  switch (field) {
    case 'name':
      return 'asc';
    case 'authorName':
      return 'asc';
    case 'favorites':
      return 'desc';
    case 'dateAdded':
      return 'desc';
    case 'lastUpdated':
      return 'desc';
  }
};

type SortFieldChangeProps = {
  sortField: SortField;
  setSortField: (value: SortField) => void;
  setSortDirection: (value: SortDirection) => void;
};

export const handleSortFieldChange = ({
  sortField,
  setSortField,
  setSortDirection,
}: SortFieldChangeProps) => {
  setSortField(sortField);
  setSortDirection(getDefaultDirection(sortField));
};

type SortDirectionChangeProps = {
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
};

export const handleReverseSortDirection = ({
  sortDirection,
  setSortDirection,
}: SortDirectionChangeProps) => {
  setSortDirection(sortDirection == 'asc' ? 'desc' : 'asc');
};
