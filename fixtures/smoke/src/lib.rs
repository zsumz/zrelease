//! A tiny library for exercising the delivery pipeline without real releases.

/// Return a deterministic value so a downstream consumer can check its API.
pub fn answer() -> u32 {
    44
}

#[cfg(test)]
mod tests {
    #[test]
    fn returns_expected_value() {
        assert_eq!(super::answer(), 44);
    }
}
