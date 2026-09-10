pub fn answer() -> u32 { engine::value() + env!("OFFSET").parse::<u32>().unwrap() }

#[test]
fn answer_uses_packaged_dependencies() { assert_eq!(answer(), 42); }
