import { FilterDisplay, FilterDisplayProps } from './filter-display';
import { NavigationBar, NavigationBarProps } from './navigation-bar';

interface MainPageHeaderInterfaceProps {
  filterProps: FilterDisplayProps;
  navBarProps: NavigationBarProps;
}

export function MainPageHeaderInterface(props: MainPageHeaderInterfaceProps) {
  const { filterProps, navBarProps } = props;

  return (
    <div className="flex flex-col gap-2">
      <FilterDisplay {...filterProps} />
      <NavigationBar {...navBarProps} />
    </div>
  );
}
