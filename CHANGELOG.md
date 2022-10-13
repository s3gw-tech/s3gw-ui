# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - unreleased

### Added

- Add basic bucket management features for non-admin users. They
  can create/update/delete buckets.

### Fixed

- Login page does not show error messages (gh#aquarist-labs/s3gw#136).

### Changed

- Continuing to adapt the UI according to the Rancher UI design kit.

## [0.6.0] - 2022-09-29

### Added

- Add ability to enable/disable versioning of objects in buckets.

### Changed

- Start adapting the UI according to the Rancher UI design kit.

## [0.5.0] - 2022-09-15

### Added

- Add Dashboard widget framework.
- Add `Total users` and `Total buckets` Dashboard widgets.

### Changed

- Mark the user/bucket quota settings in the user form as non-functional
  because the feature is not properly supported by the S3GW.

## [0.4.0] - 2022-09-01

### Added

- Add ability to configure none/unlimited buckets per user.
- Add user/bucket quota configuration per user.
- Add basic bucket management support.
- Improve project branding.

### Changed

- The file to configure the RGW AdminOps API at runtime has been
  renamed to `/assets/rgw_service.config.json`.

## [0.3.0] - 2022-08-04

### Added

- Add the ability to configure the RGW AdminOps API at runtime via the
  file `/assets/rgw_admin_ops.config.json`. 

## [0.2.0] - 2022-07-28

### Added

- Rudimentary user management, incl. creating, editing and deleting.
- User key management.

## [0.1.0] - 2022-07-14

- Initial release.
