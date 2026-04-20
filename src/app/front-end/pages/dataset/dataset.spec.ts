import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dataset } from './dataset';

describe('Dataset', () => {
  let component: Dataset;
  let fixture: ComponentFixture<Dataset>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dataset],
    }).compileComponents();

    fixture = TestBed.createComponent(Dataset);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
