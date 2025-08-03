mod definitions;
mod logic;

pub use definitions::CreateInstanceRequest;
pub use definitions::CreateInstanceRequestBuilder;
pub use definitions::GroupOnlyInstanceConfig;
pub use definitions::InstanceRegion;
pub use definitions::InstanceType;

pub use logic::create_instance;
pub use logic::get_instance_short_name;
