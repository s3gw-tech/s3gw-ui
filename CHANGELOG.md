# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.18.0]

### Changed

- Enhance branding support (gh#aquarist-labs/s3gw#552).

### Fixed

- Deleting a versioned object is not properly implemented (gh#aquarist-labs/s3gw#550).
- Do not delete object by version (gh#aquarist-labs/s3gw#576).
- Prevent the restoring of the deleted object version (gh#aquarist-labs/s3gw#583).

## [0.17.0]

### Added

- Add object version management (gh#aquarist-labs/s3gw#255).
- Add branding support (gh#aquarist-labs/s3gw#552).

### Fixed

- Do not display objects that have also a delete marker (gh#aquarist-labs/s3gw#548).
- Search button only performs a search on a page level (gh#aquarist-labs/s3gw#556).
- The datatable pagination does not show the correct number of displayed items (gh#aquarist-labs/s3gw#559).

## [0.16.0]

### Removed

- Disable bucket and user quotas in the UI (gh#aquarist-labs/s3gw#503).

## [0.15.0]

### Added

- Add tags support for objects (gh#aquarist-labs/s3gw#304).

### Removed

- Remove .github/workflows/build.yaml (gh#aquarist-labs/s3gw#444)

## [0.14.0]

### Added

- Add button to copy the current path of the object browser to the clipboard.
- Support legal holds on objects (gh#aquarist-labs/s3gw#365).
- Add support to manage lifecycle rules per bucket (gh#aquarist-labs/s3gw#349).

### Changed

- Display object data more intuitively (gh#aquarist-labs/s3gw#350).

## [0.13.0]

### Added

- Add support for bucket object locking (gh#aquarist-labs/s3gw#313).

### Changed

- Improve the object browser navigation bar.

## [0.12.0]

### Added

- Support folders in object explorer (gh#aquarist-labs/s3gw#241).

## [0.11.0]

### Added

- Add tags support for buckets (gh#aquarist-labs/s3gw#285).
- Add notification sidebar (gh#aquarist-labs/s3gw#172).
- Add option to remove buckets objects before deleting a bucket
  in the administrator view.

### Known Issues

- It is not possible to remove all tags (gh#aquarist-labs/s3gw#314).
- It is not possible to change the bucket owner (gh#aquarist-labs/s3gw#86).

## [0.10.0] - 2022-12-22

### Fixed

- Editing buckets in `user` mode is not possible (gh#aquarist-labs/s3gw#262).
- A page reload does not re-enable the 'administration' switch (gh#aquarist-labs/s3gw#284).
- Editing buckets in `user` mode is not possible because form is in
  `Create` mode only (gh#aquarist-labs/s3gw#290).

### Added

- Add search field to data tables (gh#aquarist-labs/s3gw#157).
- Display progress while bootstrapping the app (gh#aquarist-labs/s3gw#247).
- Make datatable pagination settings persistent (gh#aquarist-labs/s3gw#242).
- Add ability to show/hide columns (gh#aquarist-labs/s3gw#65).
- Display more object information (gh#aquarist-labs/s3gw#286).

## [0.9.0] - 2022-12-01

### Fixed

- Creating a bucket with spaces crashed the app (gh#aquarist-labs/s3gw#225).
- Fix URL in the dashboard buckets widget (gh#aquarist-labs/s3gw#240).

### Added

- Add multi-selection support to data tables (gh#aquarist-labs/s3gw#135).

### Changed

- Combine the regular and administrator UI (gh#aquarist-labs/s3gw#175).

## [0.8.0] - 2022-11-10

### Fixed

- Fix table pagination issue. Only the first page was visible.

### Added

- Display an error message on the login page if the RGW endpoint is not
  configured correctly.
- Add basic object management features (gh#aquarist-labs/s3gw#146).
- Add feature to upload objects into buckets via browser (gh#aquarist-labs/s3gw#167).

## [0.7.0] - 2022-10-20

### Added

- Add basic bucket management features for non-admin users. They
  can create/update/delete buckets.

### Fixed

- Login page does not show error messages (gh#aquarist-labs/s3gw#136).

### Changed

- Continuing to adapt the UI according to the Rancher UI design kit.
- Improve error reporting.

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
